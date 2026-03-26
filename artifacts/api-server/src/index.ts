import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"] || "8080";

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const basePort = Number(rawPort);

if (Number.isNaN(basePort) || basePort <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Try to listen on the base port, or find an available port
function startServer(port: number, maxAttempts: number = 10): void {
  app.listen(port, (err) => {
    if (err) {
      if ((err as any).code === "EADDRINUSE" && maxAttempts > 1) {
        logger.warn({ port, nextPort: port + 1 }, "Port in use, trying next port");
        startServer(port + 1, maxAttempts - 1);
      } else {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }
    } else {
      logger.info({ port }, "Server listening");
    }
  });
}

startServer(basePort);
