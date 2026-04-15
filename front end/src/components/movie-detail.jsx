"use client";

import { ArrowLeft, Calendar, Clock, Heart, Loader2, Play, Star, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { fetchMovieShowtimes } from "@/services";
import { getMovieGenreList, shouldShowMovieRating } from "@/models/movie-model";
import {
  buildAutoplayTrailerUrl,
  getTrailerMimeType,
  getMovieTrailerPreviewUrl,
  getMovieTrailerUrl,
  isEmbeddableTrailerUrl
} from "@/models/movie-media";
import styles from "./movie-detail.module.css";

function formatShowtimeDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatShowtimeTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function extractDateKey(isoString) {
  return isoString.slice(0, 10); // "YYYY-MM-DD"
}

export function MovieDetail({
  movie,
  initialShowTrailer = false,
  onBack,
  onSelectShowtime,
  isFavorite = false,
  isFavoriteBusy = false,
  onToggleFavorite
}) {
  const [showTrailer, setShowTrailer] = useState(false);
  const [scheduledShowtimes, setScheduledShowtimes] = useState([]);
  const [isLoadingShowtimes, setIsLoadingShowtimes] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);

  const trailerUrl = getMovieTrailerUrl(movie);
  const hasTrailer = trailerUrl.length > 0;
  const isEmbeddableTrailer = hasTrailer && isEmbeddableTrailerUrl(trailerUrl);
  const trailerPreview = getMovieTrailerPreviewUrl(movie);
  const autoplayTrailerUrl = isEmbeddableTrailer ? buildAutoplayTrailerUrl(trailerUrl) : trailerUrl;
  const trailerMimeType = getTrailerMimeType(trailerUrl);

  // Group scheduled showtimes by date
  const showtimesByDate = useMemo(() => {
    const grouped = {};
    for (const st of scheduledShowtimes) {
      const key = extractDateKey(st.startAt);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(st);
    }
    return grouped;
  }, [scheduledShowtimes]);

  const availableDates = useMemo(() => Object.keys(showtimesByDate).sort(), [showtimesByDate]);
  const useScheduled = availableDates.length > 0;
  const timeSlotsForDate = selectedDate ? (showtimesByDate[selectedDate] ?? []) : [];

  useEffect(() => {
    setShowTrailer(Boolean(initialShowTrailer && hasTrailer));
  }, [movie?.id, initialShowTrailer, hasTrailer]);

  useEffect(() => {
    let active = true;
    setIsLoadingShowtimes(true);
    setScheduledShowtimes([]);
    setSelectedDate(null);

    fetchMovieShowtimes(movie.id)
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data?.showtimes) ? data.showtimes
          : Array.isArray(data) ? data : [];
        setScheduledShowtimes(list);
        if (list.length > 0) {
          setSelectedDate(extractDateKey(list[0].startAt));
        }
      })
      .catch(() => {
        if (active) setScheduledShowtimes([]);
      })
      .finally(() => {
        if (active) setIsLoadingShowtimes(false);
      });

    return () => { active = false; };
  }, [movie.id]);

  return <div className={styles["movie-detail-class-1"]}>
      <Button variant="ghost" size="sm" onClick={onBack} className={styles["movie-detail-class-2"]}>
        <ArrowLeft className={styles["movie-detail-class-3"]} />
        Back to Movies
      </Button>

      <div className={styles["movie-detail-class-4"]}>
        <div className={styles["movie-detail-class-5"]}>
          <div className={styles["movie-detail-class-6"]}>
            {showTrailer && hasTrailer ? <div className={styles["movie-detail-class-7"]}>
                {isEmbeddableTrailer ? <iframe src={autoplayTrailerUrl} title={`${movie.title} trailer`} className={styles["movie-detail-class-8"]} allow="autoplay; encrypted-media" allowFullScreen /> : <video className={styles["movie-detail-class-9"]} controls playsInline preload="metadata" poster={trailerPreview}>
                    <source src={trailerUrl} type={trailerMimeType} />
                    Your browser could not play this trailer. <a href={trailerUrl} target="_blank" rel="noreferrer">Open trailer</a>.
                  </video>}
              </div> : <div className={styles["movie-detail-class-10"]}>
                <img src={trailerPreview} alt={`${movie.title} poster`} className={styles["movie-detail-class-9"]} />
                {hasTrailer && <button onClick={() => setShowTrailer(true)} className={styles["movie-detail-class-11"]} aria-label={`Play ${movie.title} trailer`}>
                    <div className={styles["movie-detail-class-12"]}>
                      <Play className={styles["movie-detail-class-13"]} />
                    </div>
                  </button>}
              </div>}
          </div>
        </div>

        <div className={styles["movie-detail-class-14"]}>
          <div>
            <div className={styles["movie-detail-class-30"]}>
              <h1 className={styles["movie-detail-class-15"]}>
                {movie.title}
              </h1>
              {typeof onToggleFavorite === "function" ? <Button
                  variant={isFavorite ? "default" : "outline"}
                  size="sm"
                  className={styles["movie-detail-class-31"]}
                  onClick={() => onToggleFavorite(movie)}
                  disabled={isFavoriteBusy}
                >
                  <Heart className={styles["movie-detail-class-3"]} />
                  {isFavorite ? "Favorited" : "Favorite"}
                </Button> : null}
            </div>
            <div className={styles["movie-detail-class-16"]}>
              {shouldShowMovieRating(movie) && <Badge className={styles["movie-detail-class-17"]}>{movie.rating}</Badge>}
              {getMovieGenreList(movie).map((genre) => <Badge key={`${movie.id}-${genre}`} variant="secondary" className={styles["movie-detail-class-18"]}>
                  {genre}
                </Badge>)}
              <Badge variant="outline" className={styles["movie-detail-class-19"]}>
                {movie.status === "currently_running" ? "Now Playing" : "Coming Soon"}
              </Badge>
            </div>
          </div>

          <div className={styles["movie-detail-class-20"]}>
            <span className={styles["movie-detail-class-21"]}>
              <Clock className={styles["movie-detail-class-3"]} />
              {movie.duration}
            </span>
            {shouldShowMovieRating(movie) && <span className={styles["movie-detail-class-21"]}>
                <Star className={styles["movie-detail-class-3"]} />
                {movie.rating}
              </span>}
            <span className={styles["movie-detail-class-21"]}>
              <Users className={styles["movie-detail-class-3"]} />
              {movie.director}
            </span>
          </div>

          <div>
            <h2 className={styles["movie-detail-class-22"]}>
              Synopsis
            </h2>
            <p className={styles["movie-detail-class-23"]}>
              {movie.description}
            </p>
          </div>

          <div>
            <h2 className={styles["movie-detail-class-22"]}>
              Cast
            </h2>
            <div className={styles["movie-detail-class-24"]}>
              {movie.cast.map(actor => <Badge key={actor} variant="outline" className={styles["movie-detail-class-19"]}>
                  {actor}
                </Badge>)}
            </div>
          </div>

          <div>
            <h2 className={styles["movie-detail-class-22"]}>
              Play Trailer
            </h2>
            <div className={styles["movie-detail-class-25"]}>
              <Button variant="outline" size="sm" onClick={() => setShowTrailer(!showTrailer)} disabled={!hasTrailer} className={styles["movie-detail-class-26"]}>
                <Play className={styles["movie-detail-class-3"]} />
                {hasTrailer ? showTrailer ? "Hide Trailer" : "Watch Trailer" : "Trailer Unavailable"}
              </Button>
            </div>
            {showTrailer && hasTrailer && !isEmbeddableTrailer && <p className={styles["movie-detail-class-29"]}>
                If Safari still blocks playback, open the trailer directly in a new tab: <a href={trailerUrl} target="_blank" rel="noreferrer">Open trailer</a>
              </p>}
          </div>

          <div>
            <h2 className={styles["movie-detail-class-22"]}>
              Select Date &amp; Showtime
            </h2>

            {isLoadingShowtimes ? (
              <div className={styles["movie-detail-class-25"]}>
                <Loader2 className={styles["movie-detail-class-3"]} style={{ animation: "spin 1s linear infinite" }} />
                <span style={{ marginLeft: "0.5rem" }}>Loading showtimes...</span>
              </div>
            ) : useScheduled ? (
              <>
                {/* Date picker */}
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                  {availableDates.map((dateKey) => (
                    <Button
                      key={dateKey}
                      variant={selectedDate === dateKey ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedDate(dateKey)}
                      className={styles["movie-detail-class-28"]}
                    >
                      <Calendar className={styles["movie-detail-class-3"]} />
                      {formatShowtimeDate(dateKey + "T12:00:00Z")}
                    </Button>
                  ))}
                </div>

                {/* Time slots for selected date */}
                {selectedDate && (
                  <div className={styles["movie-detail-class-27"]}>
                    {timeSlotsForDate.length === 0 ? (
                      <p style={{ fontSize: "0.875rem", opacity: 0.6 }}>No showtimes for this date.</p>
                    ) : (
                      timeSlotsForDate.map((st) => (
                        <Button
                          key={st.showtimeId}
                          variant="outline"
                          onClick={() => onSelectShowtime(movie, st.startAt)}
                          className={styles["movie-detail-class-28"]}
                        >
                          {formatShowtimeTime(st.startAt)} &bull; Add
                        </Button>
                      ))
                    )}
                  </div>
                )}
              </>
            ) : (
              <p style={{ fontSize: "0.875rem", opacity: 0.6 }}>
                No showtimes have been scheduled yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>;
}
