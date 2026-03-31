import { APICallHandler } from "./apiCallHandler";
import { API_ENDPOINTS } from "./constants";
import "./favoritesApi.module.css";

export function fetchFavorites(token) {
  return APICallHandler({
    url: API_ENDPOINTS.favorites.list,
    method: "GET",
    operation: "Fetch favorites",
    token
  });
}

export function addFavoriteMovie(movieId, token) {
  return APICallHandler({
    url: API_ENDPOINTS.favorites.add,
    method: "POST",
    operation: "Add favorite movie",
    body: { movieId },
    token
  });
}

export function removeFavoriteMovie(movieId, token) {
  return APICallHandler({
    url: API_ENDPOINTS.favorites.remove(encodeURIComponent(String(movieId))),
    method: "DELETE",
    operation: "Remove favorite movie",
    token
  });
}
