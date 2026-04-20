import { APICallHandler } from "./apiCallHandler";
import { API_ENDPOINTS } from "./constants";
import "./favoritesApi.module.css";

export function fetchFavorites() {
  return APICallHandler({
    url: API_ENDPOINTS.favorites.list,
    method: "GET",
    operation: "Fetch favorites"
  });
}

export function addFavoriteMovie(movieId) {
  return APICallHandler({
    url: API_ENDPOINTS.favorites.add,
    method: "POST",
    operation: "Add favorite movie",
    body: { movieId }
  });
}

export function removeFavoriteMovie(movieId) {
  return APICallHandler({
    url: API_ENDPOINTS.favorites.remove(encodeURIComponent(String(movieId))),
    method: "DELETE",
    operation: "Remove favorite movie"
  });
}
