"use client";

import { ArrowLeft, Clock, Play, Star, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { getMovieGenreList, shouldShowMovieRating } from "@/models/movie-model";
import {
  buildAutoplayTrailerUrl,
  getTrailerMimeType,
  getMovieTrailerPreviewUrl,
  getMovieTrailerUrl,
  isEmbeddableTrailerUrl
} from "@/models/movie-media";
import styles from "./movie-detail.module.css";
export function MovieDetail({
  movie,
  initialShowTrailer = false,
  onBack,
  onSelectShowtime
}) {
  const [showTrailer, setShowTrailer] = useState(false);
  const trailerUrl = getMovieTrailerUrl(movie);
  const hasTrailer = trailerUrl.length > 0;
  const defaultShowtime = movie.showtimes[0];
  const isEmbeddableTrailer = hasTrailer && isEmbeddableTrailerUrl(trailerUrl);
  const trailerPreview = getMovieTrailerPreviewUrl(movie);
  const autoplayTrailerUrl = isEmbeddableTrailer ? buildAutoplayTrailerUrl(trailerUrl) : trailerUrl;
  const trailerMimeType = getTrailerMimeType(trailerUrl);

  useEffect(() => {
    setShowTrailer(Boolean(initialShowTrailer && hasTrailer));
  }, [movie?.id, initialShowTrailer, hasTrailer]);

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
            <h1 className={styles["movie-detail-class-15"]}>
              {movie.title}
            </h1>
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
              Add to Cart by Showtime
            </h2>
            <div className={styles["movie-detail-class-25"]}>
              <Button onClick={() => defaultShowtime && onSelectShowtime(movie, defaultShowtime)} disabled={!defaultShowtime}>
                {defaultShowtime ? `Add to Cart (${defaultShowtime})` : "Add to Cart"}
              </Button>
            </div>
            <div className={styles["movie-detail-class-27"]}>
              {movie.showtimes.map(time => <Button key={time} variant="outline" onClick={() => onSelectShowtime(movie, time)} className={styles["movie-detail-class-28"]}>
                  {time} • Add
                </Button>)}
            </div>
          </div>
        </div>
      </div>
    </div>;
}
