import { createServer } from "http";
import { Server } from "socket.io";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);
const wsPort = parseInt(process.env.WS_PORT || "3001", 10);

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  // WebSocket server on separate port
  const wsServer = createServer();
  const io = new Server(wsServer, {
    cors: {
      origin: `http://${hostname}:${port}`,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("subscribe:run", (runId: string) => {
      socket.join(`run:${runId}`);
      console.log(`Client ${socket.id} subscribed to run:${runId}`);
    });

    socket.on("subscribe:test", (testId: string) => {
      socket.join(`test:${testId}`);
      console.log(`Client ${socket.id} subscribed to test:${testId}`);
    });

    socket.on("unsubscribe:run", (runId: string) => {
      socket.leave(`run:${runId}`);
    });

    socket.on("unsubscribe:test", (testId: string) => {
      socket.leave(`test:${testId}`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  // Export io for use in API routes
  (globalThis as Record<string, unknown>).__io = io;

  wsServer.listen(wsPort, () => {
    console.log(`> WebSocket server ready on http://${hostname}:${wsPort}`);
  });

  // Next.js HTTP server
  const httpServer = createServer(handler);
  httpServer.listen(port, () => {
    console.log(`> Next.js ready on http://${hostname}:${port}`);
  });
});
