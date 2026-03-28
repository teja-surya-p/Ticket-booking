"use client";

import { Bell, Clock, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMovieGenreList, shouldShowMovieRating } from "@/models/movie-model";
import { getMoviePosterUrl } from "@/models/movie-media";
import styles from "./movie-card.module.css";
export function MovieCard({
  movie,
  onClick,
  onAddToCart,
  onNotifyMe
}) {
  const defaultShowtime = movie.showtimes[0];
  const posterUrl = getMoviePosterUrl(movie);
  const isComingSoon = movie.status === "coming_soon";
  return <article className={"group movie-card-class-1"}>
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
            {defaultShowtime ? `Default showtime: ${defaultShowtime}` : "No showtimes available"}
          </p>
        </div>
      </button>
      <div className={styles["movie-card-class-16"]}>
        <Button
          type="button"
          size="sm"
          className={styles["movie-card-class-17"]}
          onClick={() => {
            if (isComingSoon) {
              onNotifyMe?.(movie);
              return;
            }

            onAddToCart(movie);
          }}
          disabled={!isComingSoon && !defaultShowtime}
        >
          {isComingSoon ? <>
              <Bell className={styles["movie-card-class-18"]} />
              Notify Me
            </> : defaultShowtime ? "Add to Cart" : "Unavailable"}
        </Button>
      </div>
    </article>;
}
