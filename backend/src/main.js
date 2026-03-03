import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { API_PREFIX } from "./common/constants.js";
import { appConfig } from "./config/app.config.js";
import { AppModule } from "./app.module.js";

async function bootstrap() {
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
    credentials: !allowAllOrigins
  });

  app.setGlobalPrefix(API_PREFIX);
  await app.listen(appConfig.port);
  console.log(`Backend running on http://localhost:${appConfig.port}/${API_PREFIX}`);
}

void bootstrap();
