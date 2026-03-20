let app: any;
try {
  app = (await import("../server.js")).default;
} catch (e: any) {
  const express = (await import("express")).default;
  app = express();
  app.use((_req: any, res: any) => {
    res.status(500).json({ error: "Server init failed", message: e.message, stack: e.stack?.split("\n").slice(0, 5) });
  });
}

export default app;
