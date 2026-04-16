import { APICallHandler } from "./apiCallHandler";
import { getAdminAuthHeaders } from "./adminSession";
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

export function fetchShowroomById(showroomId) {
  return APICallHandler({
    url: API_ENDPOINTS.showrooms.detail(showroomId),
    method: "GET",
    operation: "Fetch showroom by id"
  });
}

export function createShowroom(payload) {
  return APICallHandler({
    url: API_ENDPOINTS.showrooms.list,
    method: "POST",
    operation: "Create hall",
    body: payload,
    header: getAdminAuthHeaders()
  });
}

export function updateShowroom(showroomId, payload) {
  return APICallHandler({
    url: API_ENDPOINTS.showrooms.detail(showroomId),
    method: "PATCH",
    operation: "Update hall",
    body: payload,
    header: getAdminAuthHeaders()
  });
}

export function deleteShowroom(showroomId) {
  return APICallHandler({
    url: API_ENDPOINTS.showrooms.detail(showroomId),
    method: "DELETE",
    operation: "Delete hall",
    allowEmptyResponse: true,
    header: getAdminAuthHeaders()
  });
}
