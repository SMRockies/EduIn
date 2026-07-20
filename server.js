import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import aiRoutes from "./routes/ai.routes.js";
import documentRoutes from "./routes/document.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { requestLogger } from "./middleware/logger.middleware.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const allowedOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function createCorsOptions() {
  return {
    origin(origin, cb) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }

      return cb(null, false);
    },
    credentials: true
  };
}

function logStartupBanner() {
  console.log(`EduAI server running on http://localhost:${PORT}`);
  if (allowedOrigins.length > 0) {
    console.log(`CORS allowed origins: ${allowedOrigins.join(", ")}`);
  } else {
    console.log("CORS allowed origins: all origins (configure CORS_ORIGIN to restrict)");
  }
}

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(cors(createCorsOptions()));
app.options("*", cors(createCorsOptions()));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.static(publicDir));
app.use(requestLogger);

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    service: "EduAI",
    status: "ok",
    uptime: process.uptime()
  });
});

app.use("/api", aiRoutes);
app.use("/api/documents", documentRoutes);

app.get("/", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use(errorHandler);

const server = app.listen(PORT, logStartupBanner);

function shutdown(signal) {
  console.log(`Received ${signal}. Shutting down EduAI server...`);
  server.close(() => {
    console.log("EduAI server stopped.");
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
