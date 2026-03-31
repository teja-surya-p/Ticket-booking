"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3, Heart, Play, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import {
  getMovieTrailerPreviewUrl,
  getMovieTrailerUrl
} from "@/models/movie-media";
import { getMovieGenreList, shouldShowMovieRating } from "@/models/movie-model";
import styles from "./home-hero-carousel.module.css";

const AUTO_ADVANCE_MS = 6000;
const NO_OP = () => {};

function truncateText(value, maxLength) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trimEnd()}...`;
}

export function HomeHeroCarousel({
  movies = [],
  onMovieClick = NO_OP,
  onAddToCart = NO_OP,
  onWatchTrailer = NO_OP,
  onToggleFavorite = NO_OP,
  favoriteMovieIds = [],
  favoritePendingMovieIds = []
}) {
  const [carouselApi, setCarouselApi] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const favoriteMovieIdSet = useMemo(
    () =>
      new Set(
        (Array.isArray(favoriteMovieIds) ? favoriteMovieIds : [])
          .map((movieId) =>
            typeof movieId === "number"
              ? String(movieId)
              : typeof movieId === "string"
                ? movieId.trim()
                : ""
          )
          .filter(Boolean)
      ),
    [favoriteMovieIds]
  );
  const favoritePendingMovieIdSet = useMemo(
    () =>
      new Set(
        (Array.isArray(favoritePendingMovieIds) ? favoritePendingMovieIds : [])
          .map((movieId) =>
            typeof movieId === "number"
              ? String(movieId)
              : typeof movieId === "string"
                ? movieId.trim()
                : ""
          )
          .filter(Boolean)
      ),
    [favoritePendingMovieIds]
  );

  useEffect(() => {
    if (!carouselApi) {
      return;
    }

    const syncActiveIndex = () => {
      setActiveIndex(carouselApi.selectedScrollSnap());
    };

    syncActiveIndex();
    carouselApi.on("select", syncActiveIndex);
    carouselApi.on("reInit", syncActiveIndex);

    return () => {
      carouselApi.off("select", syncActiveIndex);
      carouselApi.off("reInit", syncActiveIndex);
    };
  }, [carouselApi]);

  useEffect(() => {
    if (!carouselApi || isPaused || movies.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      const nextIndex = (carouselApi.selectedScrollSnap() + 1) % movies.length;
      carouselApi.scrollTo(nextIndex);
    }, AUTO_ADVANCE_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [carouselApi, isPaused, movies.length]);

  if (movies.length === 0) {
    return null;
  }

  return (
    <section
      className={styles["home-hero-shell"]}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <Carousel
        setApi={setCarouselApi}
        opts={{ loop: movies.length > 1, align: "start" }}
        className={styles["home-hero-carousel"]}
      >
        <CarouselContent>
          {movies.map((movie, index) => {
            const heroImageUrl = getMovieTrailerPreviewUrl(movie);
            const genres = getMovieGenreList(movie).slice(0, 3);
            const hasTrailer = getMovieTrailerUrl(movie).length > 0;
            const defaultShowtime = movie.showtimes[0];
            const isActive = index === activeIndex;
            const movieIdKey = typeof movie.id === "number" ? String(movie.id) : String(movie.id ?? "").trim();
            const isFavorite = favoriteMovieIdSet.has(movieIdKey);
            const isFavoriteBusy = favoritePendingMovieIdSet.has(movieIdKey);

            return (
              <CarouselItem key={`${movie.id}-${movie.title}`} className={styles["home-hero-item"]}>
                <article className={styles["home-hero-slide"]}>
                  <img
                    src={heroImageUrl}
                    alt=""
                    aria-hidden="true"
                    className={styles["home-hero-image"]}
                  />
                  <div className={styles["home-hero-image-tint"]} />
                  <div className={styles["home-hero-image-vignette"]} />

                  <div className={styles["home-hero-content"]}>
                    <div className={styles["home-hero-copy"]}>
                      <div className={styles["home-hero-kicker"]}>
                        <span className={styles["home-hero-pill"]}>Now Showing</span>
                        <span className={styles["home-hero-kicker-label"]}>Featured Film</span>
                      </div>

                      <h2 className={styles["home-hero-title"]}>{movie.title}</h2>

                      <div className={styles["home-hero-meta"]}>
                        {genres.map((genre) => (
                          <span key={`${movie.id}-${genre}`} className={styles["home-hero-meta-item"]}>
                            {genre}
                          </span>
                        ))}
                        <span className={[styles["home-hero-meta-item"], styles["home-hero-meta-item-with-icon"]].filter(Boolean).join(" ")}>
                          <Clock3 className={styles["home-hero-meta-icon"]} />
                          {movie.duration}
                        </span>
                        {shouldShowMovieRating(movie) && (
                          <span className={styles["home-hero-meta-score"]}>{movie.rating}</span>
                        )}
                      </div>

                      <p className={styles["home-hero-description"]}>
                        {truncateText(movie.description, 150)}
                      </p>

                      <div className={styles["home-hero-actions"]}>
                        <Button
                          size="lg"
                          className={styles["home-hero-primary-action"]}
                          onClick={() => {
                            if (defaultShowtime) {
                              onAddToCart(movie);
                              return;
                            }

                            onMovieClick(movie);
                          }}
                        >
                          <Ticket className={styles["home-hero-action-icon"]} />
                          {defaultShowtime ? "Add to Cart" : "View Movie"}
                        </Button>

                        <Button
                          variant="outline"
                          size="lg"
                          className={styles["home-hero-secondary-action"]}
                          onClick={() => onWatchTrailer(movie)}
                          disabled={!hasTrailer}
                        >
                          <Play className={styles["home-hero-action-icon"]} />
                          {hasTrailer ? "Watch Trailer" : "Trailer Unavailable"}
                        </Button>

                        <Button
                          variant={isFavorite ? "default" : "outline"}
                          size="lg"
                          className={styles["home-hero-secondary-action"]}
                          onClick={() => onToggleFavorite(movie)}
                          disabled={isFavoriteBusy}
                        >
                          <Heart className={isFavorite ? [styles["home-hero-action-icon"], styles["active"]].filter(Boolean).join(" ") : styles["home-hero-action-icon"]} />
                          {isFavorite ? "Favorited" : "Favorite"}
                        </Button>
                      </div>
                    </div>

                    <div className={styles["home-hero-side-panel"]}>
                      <div className={styles["home-hero-side-label"]}>Feature Reel</div>
                      <div className={styles["home-hero-side-status"]}>
                        <span className={styles["home-hero-side-status-dot"]} />
                        {isActive ? "Live spotlight" : "Queued"}
                      </div>
                      <div className={styles["home-hero-side-title"]}>{movie.title}</div>
                      <p className={styles["home-hero-side-copy"]}>
                        {defaultShowtime
                          ? `Next default showtime ${defaultShowtime}`
                          : "Open the movie page to explore more details."}
                      </p>
                      <button
                        type="button"
                        className={styles["home-hero-side-link"]}
                        onClick={() => onMovieClick(movie)}
                      >
                        Explore movie
                        <ChevronRight className={styles["home-hero-side-link-icon"]} />
                      </button>
                    </div>
                  </div>
                </article>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      <div className={styles["home-hero-controls"]}>
        <div className={styles["home-hero-pagination"]}>
          {movies.map((movie, index) => (
            <button
              key={`${movie.id}-hero-dot`}
              type="button"
              className={index === activeIndex ? [styles["home-hero-dot"], styles["active"]].filter(Boolean).join(" ") : styles["home-hero-dot"]}
              onClick={() => carouselApi?.scrollTo(index)}
              aria-label={`Go to ${movie.title}`}
              aria-pressed={index === activeIndex}
            />
          ))}
        </div>

        <div className={styles["home-hero-nav"]}>
          <button
            type="button"
            className={styles["home-hero-nav-button"]}
            onClick={() => carouselApi?.scrollPrev()}
            aria-label="Previous featured movie"
            disabled={movies.length <= 1}
          >
            <ChevronLeft className={styles["home-hero-nav-icon"]} />
          </button>
          <button
            type="button"
            className={styles["home-hero-nav-button"]}
            onClick={() => carouselApi?.scrollNext()}
            aria-label="Next featured movie"
            disabled={movies.length <= 1}
          >
            <ChevronRight className={styles["home-hero-nav-icon"]} />
          </button>
        </div>
      </div>
    </section>
  );
}
