import http from 'http';

function request(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const data = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: 'localhost', port: 3000, path, method,
      headers: { ...headers, 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(b) }); }
        catch { resolve({ status: res.statusCode, data: b }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  // Step 1: Login
  console.log('=== STEP 1: LOGIN ===');
  const login = await request('POST', '/api/auth/login', null, { email: 'test@test.com', password: 'pass' });
  console.log('Status:', login.status);
  const token = login.data.token;
  console.log('Token:', token ? 'YES' : 'NO');
  if (!token) { console.log('LOGIN FAILED'); process.exit(1); }

  // Step 2: Generate plan
  console.log('\n=== STEP 2: GENERATE PLAN ===');
  const plan = await request('POST', '/api/ui-plan', token, {
    url: 'https://refurbr-ui.vercel.app/',
    goal: 'Test page loading and navigation',
    suiteType: 'smoke'
  });
  console.log('Status:', plan.status);
  const scenarios = plan.data.scenarios || [];
  console.log('Scenario count:', scenarios.length);
  for (const s of scenarios) {
    console.log('  -', s.id, ':', s.title, '(steps:', s.steps?.length, ')');
  }

  const scenario = scenarios[0];
  if (!scenario) { console.log('ERROR: No scenarios!'); process.exit(1); }

  // Step 3: What "Approve & Execute" does
  // In handleRunUiScenario: builds PRD, calls handleGenerateUiTest(prd, url)
  console.log('\n=== STEP 3: GENERATE UI TEST ===');
  const prd = `Scenario title: ${scenario.title}\nObjective: ${scenario.objective}\nRisk: ${scenario.risk}\nSteps:\n${scenario.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
  console.log('PRD:', prd.substring(0, 120), '...');

  const gen = await request('POST', '/api/generate-ui-test', token, {
    prd: prd,
    url: 'https://refurbr-ui.vercel.app/'
  });
  console.log('Status:', gen.status);
  if (gen.status !== 200) {
    console.log('GENERATE FAILED:', JSON.stringify(gen.data));
    process.exit(1);
  }
  console.log('Code length:', gen.data.code?.length || 0);
  console.log('Code starts with:', gen.data.code?.substring(0, 80));

  // Step 4: handleGenerateUiTest then calls /api/run-tests with steps
  console.log('\n=== STEP 4: RUN TESTS ===');
  console.log('Sending steps:', scenario.steps);
  const run = await request('POST', '/api/run-tests', token, {
    url: 'https://refurbr-ui.vercel.app/',
    steps: scenario.steps
  });
  console.log('Status:', run.status);
  console.log('runId:', run.data.runId);
  if (!run.data.runId) {
    console.log('RUN FAILED:', JSON.stringify(run.data));
    process.exit(1);
  }

  // Step 5: Listen to SSE (what ConsoleStream does)
  console.log('\n=== STEP 5: SSE EVENTS (ConsoleStream) ===');
  let eventCount = 0;
  let previewCount = 0;
  let gotCompleted = false;

  const evtReq = http.get('http://localhost:3000/api/events/' + run.data.runId, res => {
    res.on('data', chunk => {
      const str = chunk.toString();
      const lines = str.split('\n').filter(l => l.startsWith('data:'));
      for (const line of lines) {
        eventCount++;
        try {
          const d = JSON.parse(line.replace('data:', ''));
          if (d.type === 'step') {
            if (d.preview) previewCount++;
            console.log(`  STEP ${d.step} [${d.status}] ${d.action.substring(0, 50)} ${d.preview ? '(PREVIEW)' : ''}`);
          } else {
            console.log(`  LOG [${d.type}] ${(d.message || '').substring(0, 70)}`);
            if (d.message === 'Run completed.') {
              gotCompleted = true;
              console.log('\n=== SUMMARY ===');
              console.log('Total events:', eventCount);
              console.log('Preview screenshots:', previewCount);
              console.log('Got "Run completed.":', gotCompleted);
              console.log('FLOW: SUCCESS');
              evtReq.destroy();
              process.exit(0);
            }
          }
        } catch (e) {}
      }
    });
  });

  setTimeout(() => {
    console.log('\nTIMEOUT after 2 minutes');
    console.log('Events received:', eventCount);
    evtReq.destroy();
    process.exit(1);
  }, 120000);
}

main();
