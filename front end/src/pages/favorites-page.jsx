"use client";

import { Heart } from "lucide-react";
import { MovieCard } from "@/components/movie-card";
import styles from "./favorites-page.module.css";

const NO_OP = () => {};

function toMovieIdSet(movieIds) {
  return new Set(
    (Array.isArray(movieIds) ? movieIds : [])
      .map((movieId) =>
        typeof movieId === "number"
          ? String(movieId)
          : typeof movieId === "string"
            ? movieId.trim()
            : ""
      )
      .filter(Boolean)
  );
}

export function FavoritesPage({
  movies = [],
  favoritesLoading = false,
  currentUser = null,
  onMovieClick = NO_OP,
  onAddToCartFromCard = NO_OP,
  onToggleFavorite = NO_OP,
  favoriteMovieIds = [],
  favoritePendingMovieIds = []
}) {
  const favoriteMovieIdSet = toMovieIdSet(favoriteMovieIds);
  const favoritePendingMovieIdSet = toMovieIdSet(favoritePendingMovieIds);
  const hasUser = typeof currentUser?.uid === "string" && currentUser.uid.trim().length > 0;

  return (
    <div className={styles["favorites-page"]}>
      <section className={styles["favorites-hero"]}>
        <div className={styles["favorites-title-row"]}>
          <Heart className={styles["favorites-icon"]} />
          <span className={styles["favorites-eyebrow"]}>My Favorites</span>
        </div>
        <h1 className={styles["favorites-title"]}>Saved movies</h1>
        <p className={styles["favorites-subtitle"]}>
          Quick access to the movies you marked with the heart icon.
        </p>
      </section>

      {!hasUser ? (
        <div className={styles["favorites-empty-state"]}>
          <p className={styles["favorites-empty-title"]}>Sign in to use favorites</p>
          <p className={styles["favorites-empty-subtitle"]}>
            Favorites are saved to your account.
          </p>
        </div>
      ) : favoritesLoading ? (
        <div className={styles["favorites-empty-state"]}>
          <p className={styles["favorites-empty-title"]}>Loading favorites...</p>
        </div>
      ) : movies.length === 0 ? (
        <div className={styles["favorites-empty-state"]}>
          <p className={styles["favorites-empty-title"]}>No favorites yet</p>
          <p className={styles["favorites-empty-subtitle"]}>
            Tap the heart icon on any movie to add it here.
          </p>
        </div>
      ) : (
        <section className={styles["favorites-grid"]}>
          {movies.map((movie) => {
            const movieIdKey =
              typeof movie?.id === "number"
                ? String(movie.id)
                : typeof movie?.id === "string"
                  ? movie.id.trim()
                  : "";

            return (
              <MovieCard
                key={movie.id}
                movie={movie}
                onClick={onMovieClick}
                onAddToCart={onAddToCartFromCard}
                isFavorite={favoriteMovieIdSet.has(movieIdKey)}
                isFavoriteBusy={favoritePendingMovieIdSet.has(movieIdKey)}
                onToggleFavorite={onToggleFavorite}
              />
            );
          })}
        </section>
      )}
    </div>
  );
}

export default function FavoritesPageRoute() {
  return <FavoritesPage />;
}
