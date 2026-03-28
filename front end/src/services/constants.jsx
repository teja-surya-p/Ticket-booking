import "./constants.module.css";
const DEFAULT_API_BASE = "http://localhost:3000";
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE;
export const API_VERSION = "v1";
export const API_PREFIX = `/api/${API_VERSION}`;
const withPrefix = path => `${API_PREFIX}${path.startsWith("/") ? path : `/${path}`}`;
export const API_ROUTES = {
  movies: withPrefix("/movies"),
  bookings: withPrefix("/bookings"),
  admin: withPrefix("/admin"),
  auth: withPrefix("/auth")
};
export const API_ENDPOINTS = {
  movies: {
    list: API_ROUTES.movies,
    detail: movieId => `${API_ROUTES.movies}/${movieId}`,
    genres: `${API_ROUTES.movies}/genres`
  },
  bookings: {
    seats: `${API_ROUTES.bookings}/seats`,
    pricing: `${API_ROUTES.bookings}/pricing`,
    quote: `${API_ROUTES.bookings}/quote`,
    create: API_ROUTES.bookings
  },
  admin: {
    stats: `${API_ROUTES.admin}/stats`
  },
  auth: {
    register: `${API_ROUTES.auth}/register`,
    syncVerification: `${API_ROUTES.auth}/sync-verification`
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
