export type TestStatus = "READY" | "PROCESSING" | "FAILED" | "DRAFT";
export type RunStatus = "PASSED" | "FAILED" | "RUNNING" | "CANCELLED" | "QUEUED";
export type NotificationSetting = "OFF" | "DEFAULT" | "CUSTOM";
export type ScheduleOption = "none" | "every5min" | "hourly" | "daily" | "weekly";

export interface Test {
  id: string;
  name: string;
  status: TestStatus;
  instructions: string;
  generatedCode: string | null;
  schedule: string | null;
  notificationSetting: NotificationSetting;
  baseUrl: string | null;
  createdAt: string;
  updatedAt: string;
  runs?: Run[];
  secrets?: TestSecret[];
  processingSteps?: ProcessingStep[];
}

export interface Run {
  id: string;
  testId: string;
  test?: Test;
  suiteRunId: string | null;
  status: RunStatus;
  duration: number | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  consoleOutput: string | null;
  screenshotUrl: string | null;
  videoUrl: string | null;
  rrwebEvents: string | null;
  steps?: RunStep[];
  createdAt: string;
}

export interface RunStep {
  id: string;
  runId: string;
  stepIndex: number;
  action: string;
  selector: string | null;
  value: string | null;
  status: RunStatus;
  duration: number | null;
  error: string | null;
  screenshot: string | null;
  createdAt: string;
}

export interface ProcessingStep {
  id: string;
  testId: string;
  stepIndex: number;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
}

export interface Suite {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  tests?: SuiteTest[];
  runs?: SuiteRun[];
  _count?: { tests: number; runs: number };
}

export interface SuiteTest {
  id: string;
  suiteId: string;
  testId: string;
  test?: Test;
  order: number;
}

export interface SuiteRun {
  id: string;
  suiteId: string;
  status: RunStatus;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  runs?: Run[];
}

export interface TestSecret {
  id: string;
  testId: string | null;
  key: string;
  value: string;
}

export interface ApiToken {
  id: string;
  name: string;
  token: string;
  lastUsed: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface SocketEvent {
  type: "run:started" | "run:step" | "run:completed" | "run:error" | "test:processing" | "test:ready";
  data: Record<string, unknown>;
}
