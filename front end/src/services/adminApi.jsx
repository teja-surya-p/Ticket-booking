import { APICallHandler } from "./apiCallHandler";
import { API_ENDPOINTS } from "./constants";
import "./adminApi.module.css";
export function fetchAdminDashboardStats() {
  return APICallHandler({
    url: API_ENDPOINTS.admin.stats,
    method: "GET",
    operation: "Fetch admin dashboard stats"
  });
}

/**
 * scheduleShowtime
 *
 * POST /api/v1/admin/showtimes
 * Schedules a showtime { movieId, showroomId, startAt } for a movie.
 * Server prevents conflicts for the same showroomId + startAt (Sprint 3).
 */
export function scheduleShowtime(payload) {
  return APICallHandler({
    url: API_ENDPOINTS.admin.scheduleShowtime,
    method: "POST",
    operation: "Schedule showtime",
    body: payload
  });
}
