import { APICallHandler } from "./apiCallHandler";
import { getAdminAuthHeaders } from "./adminSession";
import { API_ENDPOINTS } from "./constants";
import "./adminApi.module.css";
export function fetchAdminDashboardStats() {
  return APICallHandler({
    url: API_ENDPOINTS.admin.stats,
    method: "GET",
    operation: "Fetch admin dashboard stats",
    header: getAdminAuthHeaders()
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
    body: payload,
    header: getAdminAuthHeaders()
  });
}

export function sendPromotion(payload) {
  return APICallHandler({
    url: API_ENDPOINTS.admin.sendPromotion,
    method: "POST",
    operation: "Send promotion",
    body: payload,
    header: getAdminAuthHeaders()
  });
}

export function fetchAvailableShowrooms(startAt) {
  return APICallHandler({
    url: `${API_ENDPOINTS.admin.availableShowrooms}?startAt=${encodeURIComponent(startAt)}`,
    method: "GET",
    operation: "Fetch available showrooms",
    header: getAdminAuthHeaders()
  });
}

export function createPromoCode(payload) {
  return APICallHandler({
    url: API_ENDPOINTS.admin.promoCode,
    method: "POST",
    operation: "Create promo code",
    body: payload,
    header: getAdminAuthHeaders()
  });
}

export function fetchAllAdminShowtimes() {
  return APICallHandler({
    url: API_ENDPOINTS.admin.allShowtimes,
    method: "GET",
    operation: "Fetch all admin showtimes",
    header: getAdminAuthHeaders()
  });
}

export function cancelAdminShowtime(showtimeId) {
  return APICallHandler({
    url: API_ENDPOINTS.admin.cancelShowtime(showtimeId),
    method: "DELETE",
    operation: "Cancel showtime",
    header: getAdminAuthHeaders()
  });
}
