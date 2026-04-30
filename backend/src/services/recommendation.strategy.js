import { MAX_RECOMMENDATIONS, RECOMMENDATION_STRATEGIES } from "../common/constants.js";

/**
 * BaseRecommendationStrategy
 *
 * Strategy Pattern: defines the interface that all recommendation algorithms
 * must implement. Swap or chain strategies in RecommendationsService to
 * change ranking without touching orchestration or email logic.
 *
 * Implementations available:
 *   - GeminiRecommendationStrategy   (AI-ranked, uses GeminiAdapter)
 *   - GenreBasedRecommendationStrategy (deterministic fallback)
 *
 * All strategies must return an object of the form:
 *   {
 *     movies: object[],                 // ordered, best first
 *     reasonsByMovieId: { [id]: string }, // optional per-movie reason text
 *     source: string                     // RECOMMENDATION_STRATEGIES.<key>
 *   }
 */
class BaseRecommendationStrategy {
  /**
   * @param {object} params
   * @param {object[]} params.favoriteMovies - movies the user has favourited
   * @param {object[]} params.bookedMovies   - movies the user has booked (confirmed)
   * @param {object[]} params.candidates     - pre-shortlisted movies to rank
   * @param {number} [params.max]            - maximum number of recommendations
   * @returns {Promise<{ movies: object[], reasonsByMovieId: object, source: string }>}
   */
  async recommend({ favoriteMovies, bookedMovies, candidates, max }) {
    throw new Error("recommend() is not implemented");
  }
}

/**
 * Builds a compact preference summary from the user's favourites + bookings.
 *
 * Sent to the AI provider so it never sees the full Firestore database — only
 * the signals it needs to rank.
 */
function buildPreferenceSummary(favoriteMovies, bookedMovies) {
  const genreFreq = {};
  const titles = new Set();
  const cast = new Set();
  const directors = new Set();

  const ingest = (movies, weight) => {
    for (const movie of Array.isArray(movies) ? movies : []) {
      if (typeof movie?.title === "string" && movie.title.trim()) {
        titles.add(movie.title.trim());
      }
      if (typeof movie?.director === "string" && movie.director.trim()) {
        directors.add(movie.director.trim());
      }
      const movieGenres = Array.isArray(movie?.genres) ? movie.genres : [];
      for (const genre of movieGenres) {
        if (typeof genre === "string" && genre.trim()) {
          const key = genre.trim();
          genreFreq[key] = (genreFreq[key] ?? 0) + weight;
        }
      }
      const movieCast = Array.isArray(movie?.cast) ? movie.cast : [];
      for (const member of movieCast.slice(0, 3)) {
        if (typeof member === "string" && member.trim()) {
          cast.add(member.trim());
        }
      }
    }
  };

  // Bookings (purchase behaviour) carry slightly more weight than favourites.
  ingest(favoriteMovies, 1);
  ingest(bookedMovies, 2);

  const topGenres = Object.entries(genreFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([genre]) => genre);

  return {
    favoriteTitles: Array.from(titles).slice(0, 10),
    likedGenres: topGenres,
    likedCast: Array.from(cast).slice(0, 8),
    likedDirectors: Array.from(directors).slice(0, 4),
    favouriteCount: Array.isArray(favoriteMovies) ? favoriteMovies.length : 0,
    bookedCount: Array.isArray(bookedMovies) ? bookedMovies.length : 0
  };
}

/**
 * Compresses a candidate list into the minimal shape Gemini needs to rank.
 * We deliberately drop posters, trailer URLs, showroom IDs, etc.
 */
function buildCandidatePayload(candidates) {
  return (Array.isArray(candidates) ? candidates : []).map((movie) => ({
    id: Number(movie.id),
    title: typeof movie.title === "string" ? movie.title.slice(0, 120) : "",
    genres: Array.isArray(movie.genres) ? movie.genres.slice(0, 4) : [],
    director: typeof movie.director === "string" ? movie.director.slice(0, 80) : "",
    cast: Array.isArray(movie.cast) ? movie.cast.slice(0, 4) : [],
    description:
      typeof movie.description === "string" ? movie.description.slice(0, 220) : ""
  }));
}

/**
 * GeminiRecommendationStrategy
 *
 * Sends a compact preference summary plus the shortlisted candidates to
 * Gemini, validates the returned ids against the candidate set, and returns
 * the ranked movies with per-movie reason text.
 */
class GeminiRecommendationStrategy extends BaseRecommendationStrategy {
  constructor(geminiAdapter) {
    super();
    this.geminiAdapter = geminiAdapter;
  }

  async recommend({ favoriteMovies, bookedMovies, candidates, max }) {
    const limit = Number.isInteger(max) && max > 0 ? max : MAX_RECOMMENDATIONS;
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return { movies: [], reasonsByMovieId: {}, source: RECOMMENDATION_STRATEGIES.gemini };
    }

    const preferences = buildPreferenceSummary(favoriteMovies, bookedMovies);
    const payload = buildCandidatePayload(candidates);

    const rankings = await this.geminiAdapter.rankCandidates(preferences, payload, limit);

    const candidateById = new Map(candidates.map((m) => [Number(m.id), m]));
    const orderedMovies = [];
    const reasonsByMovieId = {};

    for (const ranking of rankings) {
      const movie = candidateById.get(Number(ranking.movieId));
      if (!movie) continue;
      orderedMovies.push(movie);
      if (ranking.reason) {
        reasonsByMovieId[movie.id] = ranking.reason;
      }
      if (orderedMovies.length >= limit) break;
    }

    return {
      movies: orderedMovies,
      reasonsByMovieId,
      source: RECOMMENDATION_STRATEGIES.gemini
    };
  }
}

/**
 * GenreBasedRecommendationStrategy
 *
 * Deterministic content-based ranking using genre overlap. Used as a fallback
 * when Gemini is unavailable or rejects every candidate.
 *
 *   1. Build a genre frequency map from the user's favourites + bookings.
 *   2. Score each candidate by summing the frequency of its genres.
 *   3. Return the top N movies and synthesise a short reason string.
 */
class GenreBasedRecommendationStrategy extends BaseRecommendationStrategy {
  async recommend({ favoriteMovies, bookedMovies, candidates, max }) {
    const limit = Number.isInteger(max) && max > 0 ? max : MAX_RECOMMENDATIONS;
    const signalMovies = [
      ...(Array.isArray(favoriteMovies) ? favoriteMovies : []),
      ...(Array.isArray(bookedMovies) ? bookedMovies : [])
    ];

    const genreFreq = {};
    for (const movie of signalMovies) {
      const genres = Array.isArray(movie?.genres) ? movie.genres : [];
      for (const genre of genres) {
        if (typeof genre === "string" && genre.trim()) {
          const key = genre.trim();
          genreFreq[key] = (genreFreq[key] ?? 0) + 1;
        }
      }
    }

    const scored = [];
    for (const movie of Array.isArray(candidates) ? candidates : []) {
      const movieGenres = Array.isArray(movie.genres) ? movie.genres : [];
      const matchedGenres = movieGenres.filter((g) => genreFreq[g] > 0);
      const score = matchedGenres.reduce((sum, g) => sum + (genreFreq[g] ?? 0), 0);
      scored.push({ movie, score, matchedGenres });
    }

    // If the user has no genre signal at all, surface candidates in their input
    // order (caller is expected to have pre-sorted by recency / popularity).
    if (Object.keys(genreFreq).length === 0) {
      const fallback = scored.slice(0, limit).map(({ movie }) => movie);
      return {
        movies: fallback,
        reasonsByMovieId: Object.fromEntries(
          fallback.map((m) => [
            m.id,
            "A popular pick currently playing — give it a try."
          ])
        ),
        source: RECOMMENDATION_STRATEGIES.fallback
      };
    }

    scored.sort((a, b) => b.score - a.score);
    let top = scored.filter((entry) => entry.score > 0).slice(0, limit);

    // If the user has genre signals but no candidate happens to match (e.g.
    // they only like Horror and the active catalogue has none), still surface
    // the latest active candidates so the UI is never empty.
    let usedFallback = false;
    if (top.length === 0) {
      top = scored.slice(0, limit);
      usedFallback = true;
    }

    const reasonsByMovieId = {};
    for (const entry of top) {
      const matched = entry.matchedGenres.slice(0, 3).join(", ");
      if (usedFallback) {
        reasonsByMovieId[entry.movie.id] = "A popular pick currently playing — give it a try.";
      } else {
        reasonsByMovieId[entry.movie.id] = matched
          ? `Matches genres you've enjoyed: ${matched}.`
          : "Picked from your viewing patterns.";
      }
    }

    return {
      movies: top.map((entry) => entry.movie),
      reasonsByMovieId,
      source: usedFallback ? RECOMMENDATION_STRATEGIES.fallback : RECOMMENDATION_STRATEGIES.genre
    };
  }
}

export {
  BaseRecommendationStrategy,
  GeminiRecommendationStrategy,
  GenreBasedRecommendationStrategy,
  buildPreferenceSummary,
  buildCandidatePayload
};
