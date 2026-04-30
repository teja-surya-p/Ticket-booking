"use client";

import { Sparkles, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMoviePosterUrl } from "@/models/movie-media";
import { getMovieGenreList } from "@/models/movie-model";

const NO_OP = () => {};

/**
 * RecommendationsSection
 *
 * "Recommended for You" — renders the personalised picks returned by the
 * backend recommendation engine (Gemini AI, with deterministic fallback).
 * Each card shows poster, title, genres, the AI-generated reason, and a
 * Book Now / View Details action.
 *
 * The component is intentionally presentational. Data fetching, refresh
 * triggers (favourite toggle, booking completion, page load) all live in
 * useCinemaAppController.
 */
export function RecommendationsSection({
  recommendations = [],
  isLoading = false,
  error = "",
  source = null,
  onMovieClick = NO_OP,
  onBookNow = NO_OP
}) {
  const hasItems = Array.isArray(recommendations) && recommendations.length > 0;

  const sourceLabel =
    source === "gemini"
      ? "AI-curated picks"
      : source === "genre"
        ? "Picked from your tastes"
        : source === "fallback"
          ? "Popular this week"
          : "Picked for you";

  return (
    <section
      style={{
        marginBottom: "2.5rem",
        padding: "1.25rem",
        borderRadius: "0.85rem",
        border: "1px solid var(--border)",
        background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(236,72,153,0.05))"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.25rem" }}>
        <Sparkles style={{ width: "1.05rem", height: "1.05rem", color: "var(--primary)" }} />
        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--primary)"
          }}
        >
          {sourceLabel}
        </span>
      </div>
      <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "1rem" }}>
        Recommended for You
      </h2>

      {error && (
        <p style={{ fontSize: "0.85rem", color: "var(--destructive, #ef4444)", marginBottom: "0.75rem" }}>
          {error}
        </p>
      )}

      {isLoading && !hasItems && (
        <p style={{ fontSize: "0.9rem", opacity: 0.7 }}>Finding picks for you…</p>
      )}

      {!isLoading && !error && !hasItems && (
        <p style={{ fontSize: "0.9rem", opacity: 0.7 }}>
          No picks yet — favourite a few movies or complete a booking and we&apos;ll surface tailored recommendations here.
        </p>
      )}

      {hasItems && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "1rem"
          }}
        >
          {recommendations.map((entry) => {
            const movie = entry?.movie;
            if (!movie || typeof movie.id === "undefined") return null;
            const posterUrl = getMoviePosterUrl(movie);
            const genres = getMovieGenreList(movie);
            const reason = typeof entry?.reason === "string" ? entry.reason.trim() : "";

            return (
              <article
                key={movie.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: "0.75rem",
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  overflow: "hidden"
                }}
              >
                <button
                  type="button"
                  onClick={() => onMovieClick(movie)}
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                  aria-label={`View details for ${movie.title}`}
                >
                  <img
                    src={posterUrl}
                    alt={`${movie.title} poster`}
                    style={{
                      width: "100%",
                      aspectRatio: "2 / 3",
                      objectFit: "cover",
                      display: "block"
                    }}
                  />
                </button>
                <div
                  style={{
                    padding: "0.85rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    flex: 1
                  }}
                >
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>{movie.title}</h3>
                  {genres.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                      {genres.slice(0, 3).map((genre) => (
                        <Badge key={`${movie.id}-${genre}`} variant="secondary">
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {reason && (
                    <p
                      style={{
                        fontSize: "0.82rem",
                        color: "var(--muted-foreground)",
                        margin: 0,
                        fontStyle: "italic"
                      }}
                    >
                      {reason}
                    </p>
                  )}
                  <div style={{ marginTop: "auto", display: "flex", gap: "0.5rem" }}>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onMovieClick(movie)}
                      style={{ flex: 1 }}
                    >
                      View Details
                    </Button>
                    {movie.status === "currently_running" && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onBookNow(movie)}
                        style={{ flex: 1 }}
                      >
                        <Ticket style={{ width: "0.85rem", height: "0.85rem", marginRight: "0.3rem" }} />
                        Book Now
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
