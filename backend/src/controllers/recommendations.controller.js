import { Controller, Get, Headers, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { decorateClass, decorateMethod, parameterDecorator } from "../common/nest-metadata.js";
import { RECOMMENDATION_SOURCES } from "../common/constants.js";
import { AdminAccessService } from "../services/admin-access.service.js";
import { RecommendationsService } from "../services/recommendations.service.js";

class RecommendationsController {
  constructor(recommendationsService, adminAccessService) {
    this.recommendationsService = recommendationsService;
    this.adminAccessService = adminAccessService;
  }

  /**
   * GET /api/v1/recommendations
   *
   * Returns personalised recommendations for the authenticated user. Combines
   * favourites + confirmed bookings as preference signals; falls back to
   * popular currently_running movies when no signal exists.
   *
   * Each item includes the recommendation movie payload plus an AI-generated
   * reason string suitable for display in the "Recommended for You" UI card.
   */
  async getForCurrentUser(authorization) {
    const result = await this.recommendationsService.getRecommendationsForCurrentUser(
      authorization
    );

    return {
      source: result.source,
      recommendations: result.movies.map((movie) => ({
        movie,
        reason: result.reasonsByMovieId?.[movie.id] ?? ""
      }))
    };
  }

  /**
   * POST /api/v1/recommendations/send-all
   *
   * Admin-only endpoint that triggers recommendation generation and email
   * delivery for all eligible users immediately. Returns counts.
   */
  async sendAll(adminEmail, adminPassword) {
    this.adminAccessService.requireAdminAccess(adminEmail, adminPassword);
    return await this.recommendationsService.sendRecommendationsToAllUsers(
      RECOMMENDATION_SOURCES.admin
    );
  }
}

decorateMethod(
  RecommendationsController.prototype,
  "getForCurrentUser",
  [Get(), parameterDecorator(0, Headers("authorization"))],
  { paramTypes: [String], returnType: Promise }
);

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
