"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock, Film, Play, Search, Sparkles } from "lucide-react";
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
import { fetchMovieShowtimes, subscribeToMovieNotification } from "@/services/moviesApi";
import { fetchShowrooms } from "@/services/showroomsApi";
import { toast } from "@/hooks/use-toast";
import styles from "./home-page.module.css";

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
  onWatchTrailer = NO_OP,
  onToggleFavorite = NO_OP,
  onAddToCart = NO_OP,
  favoriteMovieIds = [],
  favoritePendingMovieIds = [],
  currentUser = null
}) {
  const normalizedSearchQuery = String(searchQuery || "").trim();
  const hasSearchQuery = normalizedSearchQuery.length > 0;
  const hasGenreFilter = selectedGenre !== "all";
  const isFocusedMode = hasSearchQuery || hasGenreFilter;
  const [notifyMovie, setNotifyMovie] = useState(null);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifyDone, setNotifyDone] = useState(false);
  const [notifyError, setNotifyError] = useState("");
  const [bookNowMovie, setBookNowMovie] = useState(null);
  const [bookNowShowtimes, setBookNowShowtimes] = useState([]);
  const [bookNowLoading, setBookNowLoading] = useState(false);
  const [bookNowError, setBookNowError] = useState("");

  useEffect(() => {
    if (!bookNowMovie) {
      setBookNowShowtimes([]);
      setBookNowError("");
      return;
    }
    setBookNowLoading(true);
    setBookNowError("");
    const movieTitle = bookNowMovie.title;
    Promise.all([fetchMovieShowtimes(bookNowMovie.id), fetchShowrooms()])
      .then(([data, rooms]) => {
        const roomMap = {};
        if (Array.isArray(rooms)) {
          rooms.forEach((r) => { if (r.showroomId) roomMap[r.showroomId] = r.name ?? r.showroomId; });
        }
        const now = new Date();
        const list = Array.isArray(data) ? data : [];
        const upcoming = list
          .filter((st) => new Date(st.startAt) > now)
          .map((st) => ({ ...st, hallName: roomMap[st.showroomId] ?? null }));
        if (upcoming.length === 0) {
          setBookNowMovie(null);
          toast({
            description: `No showtimes available for "${movieTitle}".`,
            duration: 3500
          });
          return;
        }
        setBookNowShowtimes(upcoming);
      })
      .catch(() => setBookNowError("Failed to load showtimes. Please try again."))
      .finally(() => setBookNowLoading(false));
  }, [bookNowMovie]);

  const handleOpenNotify = (movie) => {
    setNotifyMovie(movie);
    setNotifyDone(false);
    setNotifyError("");
  };

  const handleNotifyMe = async () => {
    if (!currentUser?.uid) return;
    setNotifyLoading(true);
    setNotifyError("");
    try {
      await subscribeToMovieNotification(notifyMovie.id, {
        userId: currentUser.uid,
        email: currentUser.email ?? "",
        displayName: currentUser.displayName ?? currentUser.email ?? ""
      });
      setNotifyDone(true);
    } catch {
      setNotifyError("Could not save your notification request. Please try again.");
    } finally {
      setNotifyLoading(false);
    }
  };

  const handleBookNow = (movie) => {
    setBookNowMovie(movie);
  };

  const handleSelectShowtime = (showtime) => {
    const movie = bookNowMovie;
    setBookNowMovie(null); // close the showtime picker immediately
    onAddToCart(movie, showtime.startAt); // opens the ticket picker dialog
  };
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

  return (
    <div className={styles["home-content"]}>
      {moviesLoadError && <div className={styles["home-banner"]}>{moviesLoadError}</div>}
      {moviesLoading && <div className={styles["home-banner"]}>Loading movies...</div>}

      <section className={styles["home-toolbar"]}>
        <div>
          <div className={styles["home-title-row"]}>
            <Film className={styles["home-title-icon"]} />
            <span className={styles["home-eyebrow"]}>{focusedEyebrow}</span>
          </div>
          <h1 className={styles["home-title"]}>{focusedTitle}</h1>
          <p className={styles["home-subtitle"]}>{focusedSubtitle}</p>
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
          onBookNow={handleBookNow}
          onWatchTrailer={onWatchTrailer}
          onToggleFavorite={onToggleFavorite}
          favoriteMovieIds={favoriteMovieIds}
          favoritePendingMovieIds={favoritePendingMovieIds}
        />
      )}

      {!isFocusedMode && currentlyRunning.length > 0 && (
        <section className={styles["home-section"]}>
          <div className={styles["home-section-header"]}>
            <div>
              <div className={styles["home-title-row"]}>
                <Play className={styles["home-section-icon"]} />
                <span className={styles["home-eyebrow"]}>Now Playing</span>
              </div>
              <h2 className={styles["home-section-title"]}>Currently running</h2>
            </div>
          </div>
          <div className={styles["home-movie-grid"]}>
            {currentlyRunning.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onClick={onMovieClick}
                onBookNow={handleBookNow}
                onNotifyMe={handleOpenNotify}
                isFavorite={favoriteMovieIdSet.has(String(movie.id))}
                isFavoriteBusy={favoritePendingMovieIdSet.has(String(movie.id))}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </section>
      )}

      {isFocusedMode && filteredMovies.length > 0 ? (
        <section className={styles["home-search-shell"]}>
          <div className={styles["home-section-header"]}>
            <div>
              <div className={styles["home-title-row"]}>
                <Search className={styles["home-section-icon"]} />
                <span className={styles["home-eyebrow"]}>{resultEyebrow}</span>
              </div>
              <h2 className={styles["home-section-title"]}>{resultTitle}</h2>
            </div>
          </div>
          <div
            className={
              filteredMovies.length === 1
                ? [styles["home-search-grid"], styles["home-search-grid-single"]].filter(Boolean).join(" ")
                : styles["home-search-grid"]
            }
          >
            {filteredMovies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onClick={onMovieClick}
                onNotifyMe={handleOpenNotify}
                isFavorite={favoriteMovieIdSet.has(String(movie.id))}
                isFavoriteBusy={favoritePendingMovieIdSet.has(String(movie.id))}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </section>
      ) : null}

      {!isFocusedMode && comingSoon.length > 0 ? (
        <section className={styles["home-section"]}>
          <div className={styles["home-section-header"]}>
            <div>
              <div className={styles["home-title-row"]}>
                <Sparkles className={styles["home-section-icon"]} />
                <span className={styles["home-eyebrow"]}>Coming Soon</span>
              </div>
              <h2 className={styles["home-section-title"]}>Upcoming releases</h2>
            </div>
          </div>
          <div className={styles["home-movie-grid"]}>
            {comingSoon.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onClick={onMovieClick}
                onNotifyMe={handleOpenNotify}
                isFavorite={favoriteMovieIdSet.has(String(movie.id))}
                isFavoriteBusy={favoritePendingMovieIdSet.has(String(movie.id))}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </section>
      ) : null}

      {!moviesLoading && filteredMovies.length === 0 && (
        <div className={styles["home-empty-state"]}>
          <p className={styles["home-empty-title"]}>{emptyTitle}</p>
          <p className={styles["home-empty-subtitle"]}>{emptySubtitle}</p>
        </div>
      )}

      <Dialog open={Boolean(notifyMovie)} onOpenChange={(open) => {
        if (!open) { setNotifyMovie(null); setNotifyDone(false); setNotifyError(""); }
      }}>
        <DialogContent className={styles["home-notify-dialog"]}>
          <DialogHeader>
            <DialogTitle>
              {notifyDone ? "You're on the list!" : "Get notified"}
            </DialogTitle>
            <DialogDescription className={styles["home-notify-copy"]}>
              {notifyDone
                ? `We'll email you as soon as showtimes for "${notifyMovie?.title}" are scheduled.`
                : notifyMovie
                  ? `Want to know when showtimes for "${notifyMovie.title}" go live? We'll send you an email the moment the first slot is added.`
                  : ""}
            </DialogDescription>
          </DialogHeader>

          {!notifyDone && (
            <div style={{ paddingTop: "0.25rem" }}>
              {!currentUser?.uid ? (
                <p style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                  Please sign in to register for notifications.
                </p>
              ) : (
                <p style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                  Notification will be sent to <strong>{currentUser.email}</strong>.
                </p>
              )}
              {notifyError && (
                <p style={{ fontSize: "0.8rem", color: "var(--color-destructive, #ef4444)", marginTop: "0.4rem" }}>
                  {notifyError}
                </p>
              )}
            </div>
          )}

          <DialogFooter className={styles["home-notify-actions"]}>
            <Button type="button" variant="outline" onClick={() => { setNotifyMovie(null); setNotifyDone(false); setNotifyError(""); }}>
              {notifyDone ? "Close" : "Cancel"}
            </Button>
            {!notifyDone && currentUser?.uid && (
              <Button type="button" onClick={handleNotifyMe} disabled={notifyLoading}>
                {notifyLoading ? "Saving…" : "Notify Me"}
              </Button>
            )}
            {!notifyDone && !currentUser?.uid && (
              <Button type="button" onClick={() => { setNotifyMovie(null); window.location.href = "/login?mode=login"; }}>
                Sign In
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(bookNowMovie)} onOpenChange={(open) => {
        if (!open) setBookNowMovie(null);
      }}>
        <DialogContent className={styles["home-notify-dialog"]}>
          <DialogHeader>
            <DialogTitle style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Calendar style={{ width: "1.1rem", height: "1.1rem", color: "var(--primary)" }} />
              Select a Showtime
            </DialogTitle>
            <DialogDescription className={styles["home-notify-copy"]}>
              {bookNowMovie ? `Pick a showtime for "${bookNowMovie.title}" to add to your cart.` : ""}
            </DialogDescription>
          </DialogHeader>

          <div style={{ marginTop: "0.5rem" }}>
            {bookNowLoading && (
              <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", textAlign: "center", padding: "1.5rem 0" }}>
                Loading showtimes…
              </p>
            )}
            {bookNowError && (
              <p style={{ fontSize: "0.875rem", color: "var(--destructive)", textAlign: "center", padding: "0.75rem 0" }}>
                {bookNowError}
              </p>
            )}
            {!bookNowLoading && !bookNowError && bookNowShowtimes.length === 0 && (
              <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)", textAlign: "center", padding: "1.5rem 0" }}>
                No upcoming showtimes available for this movie.
              </p>
            )}
            {!bookNowLoading && bookNowShowtimes.length > 0 && (() => {
              // Group showtimes by calendar date key "YYYY-MM-DD"
              const groups = [];
              const seen = {};
              for (const st of bookNowShowtimes) {
                const dateKey = st.startAt.slice(0, 10);
                if (!seen[dateKey]) {
                  seen[dateKey] = true;
                  groups.push({ dateKey, showtimes: [] });
                }
                groups[groups.length - 1].showtimes.push(st);
              }
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxHeight: "20rem", overflowY: "auto", paddingRight: "0.25rem" }}>
                  {groups.map(({ dateKey, showtimes }) => {
                    const dateLabel = new Date(dateKey + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
                    return (
                      <div key={dateKey}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
                          <Calendar style={{ width: "0.875rem", height: "0.875rem", color: "var(--primary)", flexShrink: 0 }} />
                          <span style={{ fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
                            {dateLabel}
                          </span>
                          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                          {showtimes.map((st) => {
                            const timeLabel = new Date(st.startAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" });
                            const hallName = st.hallName ?? null;
                            return (
                              <button
                                key={st.showtimeId ?? st.startAt}
                                type="button"
                                onClick={() => handleSelectShowtime(st)}
                                style={{
                                  display: "inline-flex",
                                  flexDirection: "column",
                                  alignItems: "flex-start",
                                  gap: "0.15rem",
                                  padding: "0.45rem 0.9rem",
                                  borderRadius: "0.6rem",
                                  border: "1px solid var(--border)",
                                  background: "var(--secondary)",
                                  cursor: "pointer",
                                  transition: "background 0.15s, border-color 0.15s"
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary)"; e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.querySelector("[data-time]").style.color = "var(--primary-foreground)"; if (e.currentTarget.querySelector("[data-hall]")) e.currentTarget.querySelector("[data-hall]").style.color = "rgba(255,255,255,0.8)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--secondary)"; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.querySelector("[data-time]").style.color = "var(--foreground)"; if (e.currentTarget.querySelector("[data-hall]")) e.currentTarget.querySelector("[data-hall]").style.color = "var(--muted-foreground)"; }}
                              >
                                <span data-time style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.875rem", fontWeight: 500, color: "var(--foreground)" }}>
                                  <Clock style={{ width: "0.8rem", height: "0.8rem", flexShrink: 0 }} />
                                  {timeLabel}
                                </span>
                                {hallName && (
                                  <span data-hall style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", paddingLeft: "1.2rem" }}>
                                    {hallName}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          <DialogFooter className={styles["home-notify-actions"]}>
            <Button type="button" variant="ghost" onClick={() => setBookNowMovie(null)}>
              Cancel
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
