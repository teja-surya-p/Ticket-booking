export const API_PREFIX = "api/v1";

export const FIRESTORE_COLLECTIONS = {
  movies: "movies",
  bookings: "booking",
  paymentCards: "payment_cards",
  favorites: "favorites",
  users: "users",
  showrooms: "showrooms",
  showtimes: "showtimes",
  promotions: "promotions",
  promoCodes: "promoCodes",
  movieNotifications: "movieNotifications",
  emailVerificationCodes: "emailVerificationCodes"
};

export const USER_ACCOUNT_STATUSES = {
  active: "Active",
  inactive: "Inactive"
};

export const TICKET_PRICING = {
  adult: 12.99,
  child: 8.99,
  senior: 9.99
};

export const DEFAULT_MOVIE_POSTER = "/placeholder.jpg";
export const DEFAULT_TRAILER_URL = "";
export const BOOKING_SERVICE_FEE_RATE = 0.05;
export const MAX_TICKETS_PER_BOOKING = 6;

export const DEFAULT_RESERVED_SEATS = [
  "1-3",
  "1-4",
  "2-5",
  "3-7",
  "4-2",
  "5-8",
  "6-1",
  "7-9"
];

export const MOVIE_STATUSES = ["currently_running", "coming_soon"];
