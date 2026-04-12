import { APICallHandler } from "./apiCallHandler";
import { API_ENDPOINTS, QUERY_KEYS } from "./constants";
import "./bookingApi.module.css";
export function fetchReservedSeats(movieId, showtime) {
  return APICallHandler({
    url: API_ENDPOINTS.bookings.seats,
    method: "GET",
    operation: "Fetch reserved seats",
    query: {
      [QUERY_KEYS.movieId]: movieId,
      [QUERY_KEYS.showtime]: showtime
    }
  });
}
export function fetchTicketPricing() {
  return APICallHandler({
    url: API_ENDPOINTS.bookings.pricing,
    method: "GET",
    operation: "Fetch ticket pricing"
  });
}
export function fetchBookingQuote(payload) {
  return APICallHandler({
    url: API_ENDPOINTS.bookings.quote,
    method: "POST",
    operation: "Fetch booking quote",
    body: payload
  });
}
export function createBooking(payload, token) {
  return APICallHandler({
    url: API_ENDPOINTS.bookings.create,
    method: "POST",
    operation: "Create booking",
    body: payload,
    token
  });
}

export function fetchSavedCards(customerEmail, customerUid, token) {
  return APICallHandler({
    url: API_ENDPOINTS.bookings.card,
    method: "GET",
    operation: "Fetch saved cards",
    query: {
      customerEmail,
      customerUid
    },
    token
  });
}

export function savePaymentCard(payload, token) {
  return APICallHandler({
    url: API_ENDPOINTS.bookings.card,
    method: "POST",
    operation: "Save payment card",
    body: payload,
    token
  });
}

export function updateSavedCard(cardId, payload, token) {
  return APICallHandler({
    url: API_ENDPOINTS.bookings.cardById(encodeURIComponent(cardId)),
    method: "PATCH",
    operation: "Update saved card",
    body: payload,
    token
  });
}

export function deleteSavedCard(cardId, token) {
  return APICallHandler({
    url: API_ENDPOINTS.bookings.cardById(encodeURIComponent(cardId)),
    method: "DELETE",
    operation: "Delete saved card",
    token
  });
}

export const fetchSavedCard = fetchSavedCards;

/**
 * createDraftBooking
 *
 * POST /api/v1/bookings/draft
 * Creates a draft booking for {movieId, showtime, tickets}.
 * No auth required. Returns { bookingId } — store in sessionStorage
 * so selection survives a login redirect (Sprint 3).
 */
export function createDraftBooking(payload) {
  return APICallHandler({
    url: API_ENDPOINTS.bookings.draft,
    method: "POST",
    operation: "Create draft booking",
    body: payload
  });
}

/**
 * saveBookingSeats
 *
 * POST /api/v1/bookings/:bookingId/seats
 * Saves selected seat IDs for a draft booking.
 * Server validates seat count matches tickets and no conflicts exist.
 */
export function saveBookingSeats(bookingId, payload) {
  return APICallHandler({
    url: API_ENDPOINTS.bookings.bookingSeats(encodeURIComponent(bookingId)),
    method: "POST",
    operation: "Save booking seats",
    body: payload
  });
}

/**
 * fetchBookingSummary
 *
 * GET /api/v1/bookings/:bookingId/summary
 * Returns the full order summary. Requires Firebase Auth token (checkout step).
 */
export function fetchBookingSummary(bookingId, token) {
  return APICallHandler({
    url: API_ENDPOINTS.bookings.bookingSummary(encodeURIComponent(bookingId)),
    method: "GET",
    operation: "Fetch booking summary",
    token
  });
}
