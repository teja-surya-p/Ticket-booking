"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Clock3, Play, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import {
  getMovieTrailerPreviewUrl,
  getMovieTrailerUrl
} from "@/models/movie-media";
import { getMovieGenreList, shouldShowMovieRating } from "@/models/movie-model";
import "./home-hero-carousel.module.css";

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
  onWatchTrailer = NO_OP
}) {
  const [carouselApi, setCarouselApi] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

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
      className={"home-hero-shell"}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <Carousel
        setApi={setCarouselApi}
        opts={{ loop: movies.length > 1, align: "start" }}
        className={"home-hero-carousel"}
      >
        <CarouselContent>
          {movies.map((movie, index) => {
            const heroImageUrl = getMovieTrailerPreviewUrl(movie);
            const genres = getMovieGenreList(movie).slice(0, 3);
            const hasTrailer = getMovieTrailerUrl(movie).length > 0;
            const defaultShowtime = movie.showtimes[0];
            const isActive = index === activeIndex;

            return (
              <CarouselItem key={`${movie.id}-${movie.title}`} className={"home-hero-item"}>
                <article className={"home-hero-slide"}>
                  <img
                    src={heroImageUrl}
                    alt=""
                    aria-hidden="true"
                    className={"home-hero-image"}
                  />
                  <div className={"home-hero-image-tint"} />
                  <div className={"home-hero-image-vignette"} />

                  <div className={"home-hero-content"}>
                    <div className={"home-hero-copy"}>
                      <div className={"home-hero-kicker"}>
                        <span className={"home-hero-pill"}>Now Showing</span>
                        <span className={"home-hero-kicker-label"}>Featured Film</span>
                      </div>

                      <h2 className={"home-hero-title"}>{movie.title}</h2>

                      <div className={"home-hero-meta"}>
                        {genres.map((genre) => (
                          <span key={`${movie.id}-${genre}`} className={"home-hero-meta-item"}>
                            {genre}
                          </span>
                        ))}
                        <span className={"home-hero-meta-item home-hero-meta-item-with-icon"}>
                          <Clock3 className={"home-hero-meta-icon"} />
                          {movie.duration}
                        </span>
                        {shouldShowMovieRating(movie) && (
                          <span className={"home-hero-meta-score"}>{movie.rating}</span>
                        )}
                      </div>

                      <p className={"home-hero-description"}>
                        {truncateText(movie.description, 150)}
                      </p>

                      <div className={"home-hero-actions"}>
                        <Button
                          size="lg"
                          className={"home-hero-primary-action"}
                          onClick={() => {
                            if (defaultShowtime) {
                              onAddToCart(movie);
                              return;
                            }

                            onMovieClick(movie);
                          }}
                        >
                          <Ticket className={"home-hero-action-icon"} />
                          {defaultShowtime ? "Book Tickets" : "View Movie"}
                        </Button>

                        <Button
                          variant="outline"
                          size="lg"
                          className={"home-hero-secondary-action"}
                          onClick={() => onWatchTrailer(movie)}
                          disabled={!hasTrailer}
                        >
                          <Play className={"home-hero-action-icon"} />
                          {hasTrailer ? "Watch Trailer" : "Trailer Unavailable"}
                        </Button>
                      </div>
                    </div>

                    <div className={"home-hero-side-panel"}>
                      <div className={"home-hero-side-label"}>Feature Reel</div>
                      <div className={"home-hero-side-status"}>
                        <span className={"home-hero-side-status-dot"} />
                        {isActive ? "Live spotlight" : "Queued"}
                      </div>
                      <div className={"home-hero-side-title"}>{movie.title}</div>
                      <p className={"home-hero-side-copy"}>
                        {defaultShowtime
                          ? `Next default showtime ${defaultShowtime}`
                          : "Open the movie page to explore more details."}
                      </p>
                      <button
                        type="button"
                        className={"home-hero-side-link"}
                        onClick={() => onMovieClick(movie)}
                      >
                        Explore movie
                        <ChevronRight className={"home-hero-side-link-icon"} />
                      </button>
                    </div>
                  </div>
                </article>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      <div className={"home-hero-controls"}>
        <div className={"home-hero-pagination"}>
          {movies.map((movie, index) => (
            <button
              key={`${movie.id}-hero-dot`}
              type="button"
              className={index === activeIndex ? "home-hero-dot active" : "home-hero-dot"}
              onClick={() => carouselApi?.scrollTo(index)}
              aria-label={`Go to ${movie.title}`}
              aria-pressed={index === activeIndex}
            />
          ))}
        </div>

        <div className={"home-hero-nav"}>
          <button
            type="button"
            className={"home-hero-nav-button"}
            onClick={() => carouselApi?.scrollPrev()}
            aria-label="Previous featured movie"
            disabled={movies.length <= 1}
          >
            <ChevronLeft className={"home-hero-nav-icon"} />
          </button>
          <button
            type="button"
            className={"home-hero-nav-button"}
            onClick={() => carouselApi?.scrollNext()}
            aria-label="Next featured movie"
            disabled={movies.length <= 1}
          >
            <ChevronRight className={"home-hero-nav-icon"} />
          </button>
        </div>
      </div>
    </section>
  );
}
