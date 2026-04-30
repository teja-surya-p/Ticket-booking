import { MAX_RECOMMENDATIONS } from "../common/constants.js";

/**
 * BaseRecommendationStrategy
 *
 * Strategy Pattern: defines the interface that all recommendation algorithms
 * must implement. Swap the strategy in RecommendationsService to change the
 * algorithm without touching the orchestration or email logic.
 *
 * Potential future strategies:
 *   - PopularityBasedRecommendationStrategy  (rank by booking count)
 *   - HybridRecommendationStrategy           (genre + popularity combined)
 *   - AiBasedRecommendationStrategy          (external AI API)
 */
class BaseRecommendationStrategy {
  /**
   * @param {object} params
   * @param {object[]} params.favoriteMovies  - Movie objects the user has favorited
   * @param {object[]} params.allMovies       - All movies available for recommendation
   * @param {Set<number>} params.excludeMovieIds - IDs to exclude from results
   * @returns {object[]} Ordered list of recommended movie objects (best first)
   */
  recommend({ favoriteMovies, allMovies, excludeMovieIds }) {
    throw new Error("recommend() is not implemented");
  }
}

/**
 * GenreBasedRecommendationStrategy
 *
 * Content-based filtering using genre overlap.
 *
 * Algorithm:
 *   1. Build a genre frequency map from the user's favorite movies.
 *   2. Score each candidate movie by summing the frequency of each of its
 *      genres in that map — more overlap with favourites = higher score.
 *   3. Exclude movies that are already favourited, booked, recently
 *      recommended, or not currently_running.
 *   4. Return the top MAX_RECOMMENDATIONS by score.
 */
class GenreBasedRecommendationStrategy extends BaseRecommendationStrategy {
  recommend({ favoriteMovies, allMovies, excludeMovieIds }) {
    // 1. Build genre frequency map from favourited movies
    const genreFreq = {};
    for (const movie of favoriteMovies) {
      const genres = Array.isArray(movie.genres) ? movie.genres : [];
      for (const genre of genres) {
        if (typeof genre === "string" && genre.trim().length > 0) {
          const key = genre.trim();
          genreFreq[key] = (genreFreq[key] ?? 0) + 1;
        }
      }
    }

    // No genres in favourites → nothing to base recommendations on
    if (Object.keys(genreFreq).length === 0) {
      return [];
    }

    // 2. Score and filter candidates
    const scored = [];
    for (const movie of allMovies) {
      if (excludeMovieIds.has(movie.id)) continue;
      if (movie.status !== "currently_running") continue;

      const movieGenres = Array.isArray(movie.genres) ? movie.genres : [];
      const score = movieGenres.reduce(
        (acc, g) => acc + (genreFreq[typeof g === "string" ? g.trim() : ""] ?? 0),
        0
      );

      if (score > 0) {
        scored.push({ movie, score });
      }
    }

    // 3. Sort descending by score, return top N movie objects
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, MAX_RECOMMENDATIONS).map((item) => item.movie);
  }
}

export { BaseRecommendationStrategy, GenreBasedRecommendationStrategy };
