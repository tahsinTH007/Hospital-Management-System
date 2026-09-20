import "dotenv/config";
import { createServer } from "http";

import app from "./app.ts";
import { connectDB } from "./config/db.ts";
import { IS_SERVERLESS } from "./config/env.ts";
import { initSocket } from "./lib/socket.ts";

// On Vercel the app is exported as a Function (see app.ts); a long-lived
// server with WebSockets only makes sense when we own the process.
if (!IS_SERVERLESS) {
  const PORT = Number(process.env.PORT) || 5000;
  const httpServer = createServer(app);

  app.set("io", initSocket(httpServer));

  connectDB()
    .then(() => {
      httpServer.listen(PORT, () => {
        console.log(
          `🚀 Server + Socket.IO running in ${process.env.NODE_ENV ?? "development"} mode on port ${PORT}`,
        );
      });
    })
    .catch((error) => {
      console.error(
        `Failed to connect to the database: ${(error as Error).message}`,
      );
      process.exit(1);
    });
}

export default app;
