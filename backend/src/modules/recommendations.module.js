import { Module } from "@nestjs/common";
import { decorateClass } from "../common/nest-metadata.js";
import { RecommendationsController } from "../controllers/recommendations.controller.js";
import { AdminAccessService } from "../services/admin-access.service.js";
import { GeminiAdapter } from "../services/gemini.adapter.js";
import { ProfileNotificationService } from "../services/profile-notification.service.js";
import { RecommendationsService } from "../services/recommendations.service.js";
import { MoviesModule } from "./movies.module.js";

class RecommendationsModule {}

decorateClass(RecommendationsModule, [
  Module({
    imports: [MoviesModule],
    controllers: [RecommendationsController],
    providers: [
      RecommendationsService,
      ProfileNotificationService,
      AdminAccessService,
      GeminiAdapter
    ],
    exports: [RecommendationsService]
  })
]);

export { RecommendationsModule };
