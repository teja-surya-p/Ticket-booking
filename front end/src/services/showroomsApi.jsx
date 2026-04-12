import { APICallHandler } from "./apiCallHandler";
import { API_ENDPOINTS } from "./constants";

/**
 * fetchShowrooms
 *
 * GET /api/v1/showrooms
 * Returns all showrooms with their seat layout definitions.
 * Required for seat map rendering and admin showroom selection (Sprint 3).
 */
export function fetchShowrooms() {
  return APICallHandler({
    url: API_ENDPOINTS.showrooms.list,
    method: "GET",
    operation: "Fetch showrooms"
  });
}
