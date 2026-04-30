import { APICallHandler } from "./apiCallHandler";
import { getAdminAuthHeaders } from "./adminSession";
import { API_ENDPOINTS } from "./constants";
import "./recommendationsApi.module.css";

/**
 * fetchRecommendations
 *
 * GET /api/v1/recommendations
 *
 * Returns personalised recommendations for the authenticated user. The
 * backend combines favourites + previous bookings, ranks via Gemini, and
 * falls back to a deterministic genre-based ranking on AI failure.
 *
 * Response shape:
 *   {
 *     source: "gemini" | "genre" | "fallback",
 *     recommendations: Array<{ movie: object, reason: string }>
 *   }
 */
export function fetchRecommendations() {
  return APICallHandler({
    url: API_ENDPOINTS.recommendations.list,
    method: "GET",
    operation: "Fetch movie recommendations"
  });
}

/**
 * sendRecommendationsToAll
 *
 * POST /api/v1/recommendations/send-all
 *
 * Triggers the recommendation engine for all eligible users. The backend
 * generates personalised AI-ranked recommendations and emails each user who
 * has opted in.
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
