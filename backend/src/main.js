import "reflect-metadata";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "node:path";
import { NestFactory } from "@nestjs/core";
import { API_PREFIX } from "./common/constants.js";

function loadEnvironmentFile() {
  dotenv.config({
    path: path.resolve(process.cwd(), ".env"),
    override: false
  });
}

async function bootstrap() {
  loadEnvironmentFile();
  const [{ AppModule }, { appConfig }] = await Promise.all([
    import("./app.module.js"),
    import("./config/app.config.js")
  ]);
  const allowedHeaders = [
    "Content-Type",
    "Authorization",
    "Cookie",
    "X-Admin-Email",
    "X-Admin-Password"
  ];

  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
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
    allowedHeaders,
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
