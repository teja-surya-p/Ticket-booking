import { Controller, Headers, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { decorateClass, decorateMethod, parameterDecorator } from "../common/nest-metadata.js";
import { AdminAccessService } from "../services/admin-access.service.js";
import { RecommendationsService } from "../services/recommendations.service.js";

class RecommendationsController {
  constructor(recommendationsService, adminAccessService) {
    this.recommendationsService = recommendationsService;
    this.adminAccessService = adminAccessService;
  }

  /**
   * POST /api/v1/recommendations/send-all
   *
   * Admin-only endpoint that triggers recommendation generation and email
   * delivery for all eligible users immediately.
   *
   * Returns the number of emails sent, users skipped (no favourites /
   * opted out), and any per-user failures.
   */
  async sendAll(adminEmail, adminPassword) {
    this.adminAccessService.requireAdminAccess(adminEmail, adminPassword);
    return await this.recommendationsService.sendRecommendationsToAllUsers();
  }
}

decorateMethod(
  RecommendationsController.prototype,
  "sendAll",
  [
    Post("send-all"),
    HttpCode(HttpStatus.OK),
    parameterDecorator(0, Headers("x-admin-email")),
    parameterDecorator(1, Headers("x-admin-password"))
  ],
  { paramTypes: [String, String], returnType: Promise }
);

decorateClass(
  RecommendationsController,
  [Controller("recommendations")],
  [RecommendationsService, AdminAccessService]
);

export { RecommendationsController };
