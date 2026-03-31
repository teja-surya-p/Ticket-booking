import "reflect-metadata";
import dotenv from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { NestFactory } from "@nestjs/core";
import { API_PREFIX } from "./common/constants.js";

function resolveEnvPath(candidate) {
  if (typeof candidate !== "string" || candidate.trim().length === 0) {
    return null;
  }

  const trimmed = candidate.trim();
  return path.isAbsolute(trimmed) ? trimmed : path.resolve(process.cwd(), trimmed);
}

function loadEnvironmentFiles() {
  const candidates = [process.env.ENV_FILE, ".env", "backend.env"];
  const loadedPaths = new Set();

  for (const candidate of candidates) {
    const filePath = resolveEnvPath(candidate);
    if (!filePath || loadedPaths.has(filePath) || !existsSync(filePath)) {
      continue;
    }

    dotenv.config({
      path: filePath,
      override: false
    });
    loadedPaths.add(filePath);
  }
}

async function bootstrap() {
  loadEnvironmentFiles();
  const [{ AppModule }, { appConfig }] = await Promise.all([
    import("./app.module.js"),
    import("./config/app.config.js")
  ]);

  const app = await NestFactory.create(AppModule);
  const corsOrigins = appConfig.corsOrigin
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowAllOrigins = corsOrigins.length === 0 || corsOrigins.includes("*");

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowAllOrigins || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Type"],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
  });

  app.setGlobalPrefix(API_PREFIX);
  await app.listen(appConfig.port);
  console.log(`Backend running on http://localhost:${appConfig.port}/${API_PREFIX}`);
}

void bootstrap();
