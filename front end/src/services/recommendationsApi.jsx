import { APICallHandler } from "./apiCallHandler";
import { getAdminAuthHeaders } from "./adminSession";
import { API_ENDPOINTS } from "./constants";
import "./recommendationsApi.module.css";

/**
 * sendRecommendationsToAll
 *
 * POST /api/v1/recommendations/send-all
 *
 * Triggers the recommendation engine for all eligible users. The backend
 * generates personalised genre-based recommendations and emails each user
 * who has opted in and has at least one favourited movie.
 *
 * @returns {{ sent: number, skipped: number, failed: number }}
 */
export function sendRecommendationsToAll() {
  return APICallHandler({
    url: API_ENDPOINTS.recommendations.sendAll,
    method: "POST",
    operation: "Send movie recommendations",
    header: getAdminAuthHeaders()
  });
}
