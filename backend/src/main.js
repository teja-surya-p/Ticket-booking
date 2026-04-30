import "reflect-metadata";
import cookieParser from "cookie-parser";
import cron from "node-cron";
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

  // Schedule recommendation emails twice per week: Monday and Thursday at 09:00 server time.
  // The NestJS DI container is fully initialised after app.listen(), so app.get() is safe here.
  const { RecommendationsService } = await import("./services/recommendations.service.js");
  const recommendationsService = app.get(RecommendationsService);

  cron.schedule("0 9 * * 1,4", async () => {
    console.log("[recommendations-scheduler] Starting scheduled recommendation run…");
    try {
      const result = await recommendationsService.sendRecommendationsToAllUsers();
      console.log(`[recommendations-scheduler] Done — sent: ${result.sent}, skipped: ${result.skipped}, failed: ${result.failed}`);
    } catch (err) {
      console.error("[recommendations-scheduler] Unexpected error:", err instanceof Error ? err.message : err);
    }
  });

  console.log("[recommendations-scheduler] Scheduled — runs every Monday and Thursday at 09:00");

  // Schedule expired seat lock cleanup every 5 minutes.
  const { SeatLocksService } = await import("./services/seat-locks.service.js");
  const seatLocksService = app.get(SeatLocksService);

  cron.schedule("*/5 * * * *", async () => {
    try {
      const deleted = await seatLocksService.cleanupExpiredLocks();
      if (deleted > 0) {
        console.log(`[seat-locks] Cleaned up ${deleted} expired lock${deleted === 1 ? "" : "s"}`);
      }
    } catch (err) {
      console.error("[seat-locks] Cleanup error:", err instanceof Error ? err.message : err);
    }
  });

  console.log("[seat-locks] Cleanup cron scheduled — runs every 5 minutes");
}

void bootstrap();
