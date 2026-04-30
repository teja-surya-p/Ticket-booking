import { APICallHandler } from "./apiCallHandler";
import { API_ENDPOINTS, QUERY_KEYS } from "./constants";
import "./bookingApi.module.css";

/**
 * Returns a stable guest session ID stored in localStorage.
 * Generates one on first call using crypto.randomUUID().
 * Safe to call during SSR — returns null on the server.
 */
export function getOrCreateGuestSessionId() {
  if (typeof window === "undefined") return null;
  const key = "cinebook:guestSessionId";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `guest_${crypto.randomUUID()}`;
    localStorage.setItem(key, id);
  }
  return id;
}

/**
 * Acquires a 5-minute seat lock.
 * payload: { movieId, showtime, seatId, lockedBy, isGuest }
 */
export function lockSeat(payload) {
  return APICallHandler({
    url: API_ENDPOINTS.bookings.lockSeat,
    method: "POST",
    operation: "Lock seat",
    body: payload
  });
}

/**
 * Releases a seat lock.
 * payload: { movieId, showtime, seatId, lockedBy }
 */
export function unlockSeat(payload) {
  return APICallHandler({
    url: API_ENDPOINTS.bookings.unlockSeat,
    method: "POST",
    operation: "Unlock seat",
    body: payload
  });
}

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
export function createBooking(payload) {
  return APICallHandler({
    url: API_ENDPOINTS.bookings.create,
    method: "POST",
    operation: "Create booking",
    body: payload
  });
}

export function fetchSavedCards(customerEmail, customerUid) {
  return APICallHandler({
    url: API_ENDPOINTS.bookings.card,
    method: "GET",
    operation: "Fetch saved cards",
    query: {
      customerEmail,
      customerUid
    }
  });
}

export function savePaymentCard(payload) {
  return APICallHandler({
    url: API_ENDPOINTS.bookings.card,
    method: "POST",
    operation: "Save payment card",
    body: payload
  });
}

export function updateSavedCard(cardId, payload) {
  return APICallHandler({
    url: API_ENDPOINTS.bookings.cardById(encodeURIComponent(cardId)),
    method: "PATCH",
    operation: "Update saved card",
    body: payload
  });
}

export function deleteSavedCard(cardId) {
  return APICallHandler({
    url: API_ENDPOINTS.bookings.cardById(encodeURIComponent(cardId)),
    method: "DELETE",
    operation: "Delete saved card"
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
export function fetchBookingSummary(bookingId) {
  return APICallHandler({
    url: API_ENDPOINTS.bookings.bookingSummary(encodeURIComponent(bookingId)),
    method: "GET",
    operation: "Fetch booking summary"
  });
}

/**
 * fetchUserBookings
 *
 * GET /api/v1/bookings/mine
 * Returns all confirmed bookings for the authenticated user,
 * enriched with movieTitle and moviePoster. Requires Firebase Auth token.
 */
export function fetchUserBookings() {
  return APICallHandler({
    url: API_ENDPOINTS.bookings.mine,
    method: "GET",
    operation: "Fetch user bookings"
  });
}

export function sendEmailOtp(email) {
  return APICallHandler({
    url: API_ENDPOINTS.bookings.sendEmailOtp,
    method: "POST",
    operation: "Send email OTP",
    body: { email }
  });
}

export function verifyEmailOtp(email, code) {
  return APICallHandler({
    url: API_ENDPOINTS.bookings.verifyEmailOtp,
    method: "POST",
    operation: "Verify email OTP",
    body: { email, code }
  });
}

export function cancelBooking(bookingId) {
  return APICallHandler({
    url: API_ENDPOINTS.bookings.cancel(encodeURIComponent(bookingId)),
    method: "PATCH",
    operation: "Cancel booking"
  });
}
