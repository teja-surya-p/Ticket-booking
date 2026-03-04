"use client";

import { useState } from "react";
import { Film, Search, Sparkles } from "lucide-react";
import { HomeHeroCarousel } from "@/components/home-hero-carousel";
import { MovieCard } from "@/components/movie-card";
import { MovieFilters } from "@/components/movie-filters";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import "./home-page.module.css";

const NO_OP = () => {};

export function HomePage({
  moviesLoadError = null,
  moviesLoading = false,
  searchQuery = "",
  selectedGenre = "all",
  selectedDate = "all",
  availableGenres = [],
  currentlyRunning = [],
  comingSoon = [],
  filteredMovies = [],
  onGenreChange = NO_OP,
  onDateChange = NO_OP,
  onMovieClick = NO_OP,
  onAddToCartFromCard = NO_OP,
  onWatchTrailer = NO_OP
}) {
  const normalizedSearchQuery = String(searchQuery || "").trim();
  const hasSearchQuery = normalizedSearchQuery.length > 0;
  const hasGenreFilter = selectedGenre !== "all";
  const isFocusedMode = hasSearchQuery || hasGenreFilter;
  const [notifyMovie, setNotifyMovie] = useState(null);
  const focusedEyebrow = hasSearchQuery
    ? "Focused result"
    : hasGenreFilter
      ? "Genre selection"
      : "Browse the lineup";
  const focusedTitle = hasSearchQuery
    ? `Search results for "${normalizedSearchQuery}"`
    : hasGenreFilter
      ? `${selectedGenre} movies`
      : currentlyRunning.length > 0
        ? "Pick your next screening"
        : "Now Showing";
  const focusedSubtitle = hasSearchQuery
    ? "Only matched titles are shown here so the result stays focused."
    : hasGenreFilter
      ? `Showing ${selectedGenre} titles across currently playing and upcoming releases.`
      : "Refine the lineup, jump into a featured release, or scroll down for upcoming titles.";
  const resultEyebrow = hasSearchQuery
    ? filteredMovies.length === 1
      ? "Matched title"
      : "Matched titles"
    : hasGenreFilter
      ? filteredMovies.length === 1
        ? "Genre match"
        : "Genre matches"
      : "Matched titles";
  const resultTitle = hasSearchQuery
    ? filteredMovies.length === 1
      ? "Search match"
      : `${filteredMovies.length} matches`
    : hasGenreFilter
      ? filteredMovies.length === 1
        ? `${selectedGenre} movie`
        : `${filteredMovies.length} ${selectedGenre} movies`
      : `${filteredMovies.length} matches`;
  const emptyTitle = hasSearchQuery
    ? "No matching movie found"
    : hasGenreFilter
      ? `No ${selectedGenre} movies found`
      : "No movies found";
  const emptySubtitle = hasSearchQuery
    ? `Try another search term instead of "${normalizedSearchQuery}".`
    : hasGenreFilter
      ? `Try another genre instead of "${selectedGenre}".`
      : "Try adjusting your search or filter criteria.";

  return (
    <div className={"home-content"}>
      {moviesLoadError && <div className={"home-banner"}>{moviesLoadError}</div>}
      {moviesLoading && <div className={"home-banner"}>Loading movies...</div>}

      <section className={"home-toolbar"}>
        <div>
          <div className={"home-title-row"}>
            <Film className={"home-title-icon"} />
            <span className={"home-eyebrow"}>{focusedEyebrow}</span>
          </div>
          <h1 className={"home-title"}>{focusedTitle}</h1>
          <p className={"home-subtitle"}>{focusedSubtitle}</p>
        </div>
        <MovieFilters
          selectedGenre={selectedGenre}
          onGenreChange={onGenreChange}
          selectedDate={selectedDate}
          onDateChange={onDateChange}
          availableGenres={availableGenres}
        />
      </section>

      {!isFocusedMode && currentlyRunning.length > 0 && (
        <HomeHeroCarousel
          movies={currentlyRunning}
          onMovieClick={onMovieClick}
          onAddToCart={onAddToCartFromCard}
          onWatchTrailer={onWatchTrailer}
        />
      )}

      {isFocusedMode && filteredMovies.length > 0 ? (
        <section className={"home-search-shell"}>
          <div className={"home-section-header"}>
            <div>
              <div className={"home-title-row"}>
                <Search className={"home-section-icon"} />
                <span className={"home-eyebrow"}>{resultEyebrow}</span>
              </div>
              <h2 className={"home-section-title"}>{resultTitle}</h2>
            </div>
          </div>
          <div
            className={
              filteredMovies.length === 1
                ? "home-search-grid home-search-grid-single"
                : "home-search-grid"
            }
          >
            {filteredMovies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onClick={onMovieClick}
                onAddToCart={onAddToCartFromCard}
                onNotifyMe={setNotifyMovie}
              />
            ))}
          </div>
        </section>
      ) : null}

      {!isFocusedMode && comingSoon.length > 0 ? (
        <section className={"home-section"}>
          <div className={"home-section-header"}>
            <div>
              <div className={"home-title-row"}>
                <Sparkles className={"home-section-icon"} />
                <span className={"home-eyebrow"}>Coming Soon</span>
              </div>
              <h2 className={"home-section-title"}>Upcoming releases</h2>
            </div>
          </div>
          <div className={"home-movie-grid"}>
            {comingSoon.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onClick={onMovieClick}
                onAddToCart={onAddToCartFromCard}
                onNotifyMe={setNotifyMovie}
              />
            ))}
          </div>
        </section>
      ) : null}

      {!moviesLoading && filteredMovies.length === 0 && (
        <div className={"home-empty-state"}>
          <p className={"home-empty-title"}>{emptyTitle}</p>
          <p className={"home-empty-subtitle"}>{emptySubtitle}</p>
        </div>
      )}

      <Dialog open={Boolean(notifyMovie)} onOpenChange={(open) => {
        if (!open) {
          setNotifyMovie(null);
        }
      }}>
        <DialogContent className={"home-notify-dialog"}>
          <DialogHeader>
            <DialogTitle>Notification requested</DialogTitle>
            <DialogDescription className={"home-notify-copy"}>
              {notifyMovie
                ? `We will notify you when "${notifyMovie.title}" is released.`
                : "We will notify you when the movie is released."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className={"home-notify-actions"}>
            <Button type="button" onClick={() => setNotifyMovie(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function HomePageRoute() {
  return <HomePage />;
}
