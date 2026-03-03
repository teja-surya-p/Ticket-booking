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
  const isSearchMode = normalizedSearchQuery.length > 0;
  const [notifyMovie, setNotifyMovie] = useState(null);

  return (
    <div className={"home-content"}>
      {moviesLoadError && <div className={"home-banner"}>{moviesLoadError}</div>}
      {moviesLoading && <div className={"home-banner"}>Loading movies...</div>}

      {!isSearchMode && currentlyRunning.length > 0 && (
        <HomeHeroCarousel
          movies={currentlyRunning}
          onMovieClick={onMovieClick}
          onAddToCart={onAddToCartFromCard}
          onWatchTrailer={onWatchTrailer}
        />
      )}

      <section className={"home-toolbar"}>
        <div>
          <div className={"home-title-row"}>
            <Film className={"home-title-icon"} />
            <span className={"home-eyebrow"}>
              {isSearchMode ? "Focused result" : "Browse the lineup"}
            </span>
          </div>
          <h1 className={"home-title"}>
            {isSearchMode
              ? `Search results for "${normalizedSearchQuery}"`
              : currentlyRunning.length > 0
                ? "Pick your next screening"
                : "Now Showing"}
          </h1>
          <p className={"home-subtitle"}>
            {isSearchMode
              ? "Only matched titles are shown here so the result stays focused."
              : "Refine the lineup, jump into a featured release, or scroll down for upcoming titles."}
          </p>
        </div>
        <MovieFilters
          selectedGenre={selectedGenre}
          onGenreChange={onGenreChange}
          selectedDate={selectedDate}
          onDateChange={onDateChange}
          availableGenres={availableGenres}
        />
      </section>

      {isSearchMode && filteredMovies.length > 0 ? (
        <section className={"home-search-shell"}>
          <div className={"home-section-header"}>
            <div>
              <div className={"home-title-row"}>
                <Search className={"home-section-icon"} />
                <span className={"home-eyebrow"}>
                  {filteredMovies.length === 1 ? "Matched title" : "Matched titles"}
                </span>
              </div>
              <h2 className={"home-section-title"}>
                {filteredMovies.length === 1 ? "Search match" : `${filteredMovies.length} matches`}
              </h2>
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

      {!isSearchMode && comingSoon.length > 0 ? (
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
          <p className={"home-empty-title"}>
            {isSearchMode ? "No matching movie found" : "No movies found"}
          </p>
          <p className={"home-empty-subtitle"}>
            {isSearchMode
              ? `Try another search term instead of "${normalizedSearchQuery}".`
              : "Try adjusting your search or filter criteria."}
          </p>
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
