"use client";

import { Bell, Clock, Heart, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMovieGenreList, shouldShowMovieRating } from "@/models/movie-model";
import { getMoviePosterUrl } from "@/models/movie-media";
import styles from "./movie-card.module.css";
export function MovieCard({
  movie,
  onClick,
  onNotifyMe,
  isFavorite = false,
  isFavoriteBusy = false,
  onToggleFavorite
}) {
  const posterUrl = getMoviePosterUrl(movie);
  const isComingSoon = movie.status === "coming_soon";
  return <article className={"group movie-card-class-1"}>
      {typeof onToggleFavorite === "function" && <button
        type="button"
        className={styles["movie-card-class-19"]}
        aria-label={isFavorite ? `Remove ${movie.title} from favorites` : `Add ${movie.title} to favorites`}
        aria-pressed={isFavorite}
        onClick={(event) => {
          event.stopPropagation();
          onToggleFavorite(movie);
        }}
        disabled={isFavoriteBusy}
      >
          <Heart className={isFavorite ? [styles["movie-card-class-20"], styles["active"]].filter(Boolean).join(" ") : styles["movie-card-class-20"]} />
        </button>}
      <button type="button" onClick={() => onClick(movie)} className={styles["movie-card-class-2"]}>
        <div className={styles["movie-card-class-3"]}>
          <img src={posterUrl} alt={`${movie.title} poster`} className={styles["movie-card-class-4"]} />
          <div className={styles["movie-card-class-5"]} />
          <div className={styles["movie-card-class-6"]}>
            {shouldShowMovieRating(movie) && <Badge variant="default" className={styles["movie-card-class-7"]}>
                {movie.rating}
              </Badge>}
            {getMovieGenreList(movie).map((genre) => <Badge key={`${movie.id}-${genre}`} variant="secondary" className={styles["movie-card-class-8"]}>
                {genre}
              </Badge>)}
          </div>
        </div>
        <div className={styles["movie-card-class-9"]}>
          <h3 className={styles["movie-card-class-10"]}>
            {movie.title}
          </h3>
          <div className={styles["movie-card-class-11"]}>
            <span className={styles["movie-card-class-12"]}>
              <Clock className={styles["movie-card-class-13"]} />
              {movie.duration}
            </span>
            {shouldShowMovieRating(movie) && <span className={styles["movie-card-class-12"]}>
                <Star className={styles["movie-card-class-13"]} />
                {movie.rating}
              </span>}
          </div>
          <p className={styles["movie-card-class-14"]}>
            {movie.description}
          </p>
          <p className={styles["movie-card-class-15"]}>
            {isComingSoon ? "Coming Soon" : "Now Playing"}
          </p>
        </div>
      </button>
      <div className={styles["movie-card-class-16"]}>
        {typeof onToggleFavorite === "function" ? <Button
            type="button"
            size="sm"
            variant={isFavorite ? "default" : "outline"}
            className={styles["movie-card-class-21"]}
            onClick={() => onToggleFavorite(movie)}
            disabled={isFavoriteBusy}
          >
            <Heart className={styles["movie-card-class-18"]} />
            {isFavorite ? "Favorited" : "Favorite"}
          </Button> : null}
        {isComingSoon && (
          <Button
            type="button"
            size="sm"
            className={styles["movie-card-class-17"]}
            onClick={() => onNotifyMe?.(movie)}
          >
            <Bell className={styles["movie-card-class-18"]} />
            Notify Me
          </Button>
        )}
      </div>
    </article>;
}
