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
export function createBooking(payload) {
  return APICallHandler({
    url: API_ENDPOINTS.bookings.create,
    method: "POST",
    operation: "Create booking",
    body: payload
  });
}
