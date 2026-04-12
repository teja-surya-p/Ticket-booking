import { APICallHandler } from "./apiCallHandler";
import { API_ENDPOINTS, QUERY_KEYS } from "./constants";
import "./moviesApi.module.css";
function buildMovieQuery(params = {}) {
  return {
    [QUERY_KEYS.search]: params.search?.trim() || undefined,
    [QUERY_KEYS.genre]: params.genre && params.genre !== "all" ? params.genre : undefined,
    [QUERY_KEYS.status]: params.status,
    [QUERY_KEYS.date]: params.date && params.date !== "all" ? params.date : undefined
  };
}
export function fetchMovies(params = {}) {
  return APICallHandler({
    url: API_ENDPOINTS.movies.list,
    method: "GET",
    operation: "Fetch movies",
    query: buildMovieQuery(params)
  });
}
export function fetchMovieById(movieId) {
  return APICallHandler({
    url: API_ENDPOINTS.movies.detail(movieId),
    method: "GET",
    operation: "Fetch movie by id"
  });
}
export function fetchMovieGenres() {
  return APICallHandler({
    url: API_ENDPOINTS.movies.genres,
    method: "GET",
    operation: "Fetch movie genres"
  });
}
export function createMovie(payload) {
  return APICallHandler({
    url: API_ENDPOINTS.movies.list,
    method: "POST",
    operation: "Create movie",
    body: payload
  });
}
export function updateMovie(movieId, payload) {
  return APICallHandler({
    url: API_ENDPOINTS.movies.detail(movieId),
    method: "PATCH",
    operation: "Update movie",
    body: payload
  });
}
export function deleteMovie(movieId) {
  return APICallHandler({
    url: API_ENDPOINTS.movies.detail(movieId),
    method: "DELETE",
    operation: "Delete movie",
    allowEmptyResponse: true
  });
}

/**
 * fetchMovieShowtimes
 *
 * GET /api/v1/movies/:movieId/showtimes
 * Returns scheduled showtimes for a movie (Sprint 3 — loaded from DB).
 */
export function fetchMovieShowtimes(movieId) {
  return APICallHandler({
    url: API_ENDPOINTS.movies.showtimes(movieId),
    method: "GET",
    operation: "Fetch movie showtimes"
  });
}
