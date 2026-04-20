import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import cors from "cors";
import express from "express";
import { registerDefaultAgents } from "../application/registerDefaultAgents.js";
import { getRuntimeContext } from "../runtime/context.js";

registerDefaultAgents();
import { apiPort, corsOrigins } from "./config.js";
import { correlationMiddleware } from "./middleware/correlation.js";
import { authMiddleware } from "./middleware/auth.js";
import { createV1Router } from "./routes/apiV1.js";
import { createLogger } from "./logger.js";

const app = express();
app.disable("x-powered-by");

app.use(correlationMiddleware);
app.use(express.json({ limit: "4mb" }));

const allowed = corsOrigins();
app.use(
  cors({
    origin(origin, cb) {
      if (allowed.includes("*")) {
        cb(null, true);
        return;
      }
      if (!origin) {
        cb(null, true);
        return;
      }
      if (allowed.includes(origin)) {
        cb(null, true);
        return;
      }
      cb(null, false);
    },
  }),
);

app.use(authMiddleware);
app.use("/api/v1", createV1Router());

const webDist = path.join(getRuntimeContext().packageRoot, "web", "dist");
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
}

const port = apiPort();
app.listen(port, () => {
  createLogger().info("api_listening", { port, webStatic: fs.existsSync(webDist) });
});
