import "./constants.module.css";
const DEFAULT_API_BASE = "";
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE;
export const API_VERSION = "v1";
export const API_PREFIX = `/api/${API_VERSION}`;
const withPrefix = path => `${API_PREFIX}${path.startsWith("/") ? path : `/${path}`}`;
export const API_ROUTES = {
  movies: withPrefix("/movies"),
  bookings: withPrefix("/bookings"),
  admin: withPrefix("/admin"),
  auth: withPrefix("/auth"),
  favorites: withPrefix("/favorites"),
  showrooms: withPrefix("/showrooms"),
  promoCodes: withPrefix("/promo-codes"),
  recommendations: withPrefix("/recommendations")
};
export const API_ENDPOINTS = {
  movies: {
    list: API_ROUTES.movies,
    detail: movieId => `${API_ROUTES.movies}/${movieId}`,
    genres: `${API_ROUTES.movies}/genres`,
    showtimes: movieId => `${API_ROUTES.movies}/${movieId}/showtimes`,
    notify: movieId => `${API_ROUTES.movies}/${movieId}/notify`
  },
  bookings: {
    seats: `${API_ROUTES.bookings}/seats`,
    lockSeat: `${API_ROUTES.bookings}/seats/lock`,
    unlockSeat: `${API_ROUTES.bookings}/seats/unlock`,
    pricing: `${API_ROUTES.bookings}/pricing`,
    quote: `${API_ROUTES.bookings}/quote`,
    create: API_ROUTES.bookings,
    draft: `${API_ROUTES.bookings}/draft`,
    bookingSeats: bookingId => `${API_ROUTES.bookings}/${bookingId}/seats`,
    bookingSummary: bookingId => `${API_ROUTES.bookings}/${bookingId}/summary`,
    card: `${API_ROUTES.bookings}/card`,
    cardById: cardId => `${API_ROUTES.bookings}/card/${cardId}`,
    mine: `${API_ROUTES.bookings}/mine`,
    cancel: (bookingId) => `${API_ROUTES.bookings}/${bookingId}/cancel`,
    sendEmailOtp: `${API_ROUTES.bookings}/verify-email/send-otp`,
    verifyEmailOtp: `${API_ROUTES.bookings}/verify-email/verify-otp`
  },
  admin: {
    stats: `${API_ROUTES.admin}/stats`,
    scheduleShowtime: `${API_ROUTES.admin}/showtimes`,
    allShowtimes: `${API_ROUTES.admin}/showtimes`,
    cancelShowtime: (id) => `${API_ROUTES.admin}/showtimes/${id}`,
    sendPromotion: `${API_ROUTES.admin}/promotions`,
    availableShowrooms: `${API_ROUTES.admin}/available-showrooms`,
    promoCode: `${API_ROUTES.admin}/promo-codes`
  },
  promoCodes: {
    validate: `${API_ROUTES.promoCodes}/validate`,
    available: (userId) => `${API_ROUTES.promoCodes}/available${userId ? `?userId=${encodeURIComponent(userId)}` : ""}`
  },
  auth: {
    register: `${API_ROUTES.auth}/register`,
    syncVerification: `${API_ROUTES.auth}/sync-verification`,
    profile: `${API_ROUTES.auth}/profile`,
    passwordChanged: `${API_ROUTES.auth}/password-changed`,
    login: `${API_ROUTES.auth}/login`,
    logout: `${API_ROUTES.auth}/logout`,
    refreshSession: `${API_ROUTES.auth}/refresh-session`,
    refreshTokens: `${API_ROUTES.auth}/refresh-tokens`,
    refreshAccess: `${API_ROUTES.auth}/refresh-access`
  },
  favorites: {
    list: API_ROUTES.favorites,
    add: API_ROUTES.favorites,
    remove: (movieId) => `${API_ROUTES.favorites}/${movieId}`
  },
  showrooms: {
    list: API_ROUTES.showrooms,
    detail: (showroomId) => `${API_ROUTES.showrooms}/${showroomId}`
  },
  recommendations: {
    sendAll: `${API_ROUTES.recommendations}/send-all`
  }
};
export const QUERY_KEYS = {
  search: "search",
  genre: "genre",
  status: "status",
  date: "date",
  movieId: "movieId",
  showtime: "showtime"
};
export const MOVIE_STATUSES = ["currently_running", "coming_soon"];
export const TICKET_TYPES = ["adult", "child", "senior"];
