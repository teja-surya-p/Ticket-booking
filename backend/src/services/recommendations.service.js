import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  FIRESTORE_COLLECTIONS,
  MAX_RECOMMENDATIONS,
  MAX_RECOMMENDATION_CANDIDATES,
  RECOMMENDATION_HISTORY_LOOKBACK,
  RECOMMENDATION_SOURCES,
  RECOMMENDATION_STRATEGIES
} from "../common/constants.js";
import { decorateClass } from "../common/nest-metadata.js";
import { FirestoreService } from "../config/firestore.service.js";
import { AuthGuardService } from "./auth-guard.service.js";
import { GeminiAdapter } from "./gemini.adapter.js";
import { MoviesService } from "./movies.service.js";
import { ProfileNotificationService } from "./profile-notification.service.js";
import {
  GeminiRecommendationStrategy,
  GenreBasedRecommendationStrategy
} from "./recommendation.strategy.js";

/**
 * RecommendationsService
 *
 * Orchestrates the full recommendation pipeline:
 *   1. Fetch the user's favourites + confirmed bookings (signal sources).
 *   2. Build a shortlist of candidate movies using deterministic backend
 *      logic (currently_running, not already favourited / booked / recently
 *      recommended). Capped at MAX_RECOMMENDATION_CANDIDATES so we never
 *      ship the full catalogue to the AI provider.
 *   3. Run the primary strategy (Gemini AI). If it fails or yields nothing,
 *      fall back to the deterministic genre-based strategy.
 *   4. Persist a recommendationHistory entry with source + AI reasons so we
 *      avoid recommending the same movie twice in a row.
 *   5. Return movies enriched with per-movie reason strings for the UI/email.
 *
 * Strategy + Adapter wiring:
 *   - Algorithm   -> GeminiRecommendationStrategy / GenreBasedRecommendationStrategy
 *   - AI provider -> GeminiAdapter (swappable for OpenAI/Anthropic)
 *   - Email       -> ProfileNotificationService (adapter)
 *   - Persistence -> FirestoreService
 */
class RecommendationsService {
  constructor(
    firestoreService,
    moviesService,
    profileNotificationService,
    authGuardService,
    geminiAdapter
  ) {
    this.firestoreService = firestoreService;
    this.moviesService = moviesService;
    this.profileNotificationService = profileNotificationService;
    this.authGuardService = authGuardService;
    this.geminiAdapter = geminiAdapter;
    this.logger = new Logger(RecommendationsService.name);

    this.geminiStrategy = new GeminiRecommendationStrategy(geminiAdapter);
    this.genreStrategy = new GenreBasedRecommendationStrategy();
  }

  // ── Public: user UI flow ────────────────────────────────────────────────

  /**
   * Resolves the authenticated user from the Authorization header and returns
   * personalised recommendations for the user-facing "Recommended for You"
   * section. Falls back to active currently_running movies for users with no
   * favourites or booking history.
   */
  async getRecommendationsForCurrentUser(authorization) {
    const customer = await this.authGuardService.requireAuthenticatedCustomer(
      authorization,
      {}
    );
    return this.getRecommendationsForUser(customer, {
      source: RECOMMENDATION_SOURCES.ui,
      persistHistory: false
    });
  }

  /**
   * Builds recommendations for a single user, optionally persisting a history
   * entry. Caller is responsible for sending email if needed.
   *
   * @param {{ customerUid: string, customerEmail: string, displayName?: string }} user
   * @param {{ source: string, persistHistory?: boolean }} options
   * @returns {Promise<{ movies: object[], reasonsByMovieId: object, source: string }>}
   */
  async getRecommendationsForUser(user, { source, persistHistory = false } = {}) {
    // Pull both active and upcoming movies. Active movies are always preferred
    // candidates; upcoming movies are only used as a last-resort fallback when
    // the user has favourited every active title in the catalogue.
    const allMovies = await this.moviesService.findAll({});
    const activeMovies = allMovies.filter((m) => m.status === "currently_running");
    const upcomingMovies = allMovies.filter((m) => m.status === "coming_soon");

    const [favoriteMovieIds, bookedMovieIds, recentlyRecommendedIds] = await Promise.all([
      this.fetchFavoriteMovieIds(user),
      this.fetchBookedMovieIds(user),
      this.fetchRecentlyRecommendedMovieIds(user)
    ]);

    // Favourite/booking signals can come from any movie, regardless of status.
    const favoriteMovies = allMovies.filter((m) => favoriteMovieIds.has(m.id));
    const bookedMovies = allMovies.filter((m) => bookedMovieIds.has(m.id));

    const candidates = this.buildCandidatePool({
      activeMovies,
      upcomingMovies,
      favoriteMovieIds,
      bookedMovieIds,
      recentlyRecommendedIds
    });

    this.logger.log(
      `getRecommendationsForUser email=${user.customerEmail} active=${activeMovies.length} ` +
        `favs=${favoriteMovieIds.size} booked=${bookedMovieIds.size} ` +
        `recentHist=${recentlyRecommendedIds.size} candidates=${candidates.length}`
    );

    if (candidates.length === 0) {
      return { movies: [], reasonsByMovieId: {}, source: RECOMMENDATION_STRATEGIES.fallback };
    }

    const result = await this.runStrategiesWithFallback({
      favoriteMovies,
      bookedMovies,
      candidates
    });

    if (persistHistory && result.movies.length > 0) {
      await this.recordHistory(user, result, source);
    }

    return result;
  }

  // ── Public: admin / cron flow ───────────────────────────────────────────

  /**
   * Generates and emails personalised recommendations to every eligible user.
   * Used both by the admin "Send Recommendations" button and the twice-weekly
   * cron in main.js.
   *
   * Eligibility:
   *   - User has an email address
   *   - promotionsOptIn === true
   *
   * Users with no favourites/bookings still receive recommendations (falling
   * back to active currently_running movies) — matches the spec's "use
   * popular/latest/active movies as fallback" rule.
   *
   * @param {string} [source] one of RECOMMENDATION_SOURCES
   */
  async sendRecommendationsToAllUsers(source = RECOMMENDATION_SOURCES.cron) {
    const db = this.firestoreService.db();
    const usersSnap = await db.collection(FIRESTORE_COLLECTIONS.users).get();

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const userDoc of usersSnap.docs) {
      const data = userDoc.data() ?? {};
      const userUid = userDoc.id;
      const email = typeof data.email === "string" ? data.email.trim() : "";

      if (!email) {
        skipped++;
        continue;
      }
      if (data.promotionsOptIn !== true) {
        skipped++;
        continue;
      }

      try {
        const user = {
          customerUid: userUid,
          customerEmail: email,
          displayName: data.displayName
        };

        const result = await this.getRecommendationsForUser(user, {
          source,
          persistHistory: true
        });

        if (result.movies.length === 0) {
          skipped++;
          continue;
        }

        await this.profileNotificationService.sendRecommendationEmail(
          { uid: userUid, email, displayName: data.displayName },
          result.movies,
          { reasonsByMovieId: result.reasonsByMovieId }
        );

        sent++;
      } catch (err) {
        this.logger.error(
          `Failed to send recommendations to ${email}: ${err instanceof Error ? err.message : err}`
        );
        failed++;
      }
    }

    this.logger.log(
      `sendRecommendationsToAllUsers complete — sent: ${sent}, skipped: ${skipped}, failed: ${failed}`
    );
    return { sent, skipped, failed };
  }

  // ── Internal: data fetchers ─────────────────────────────────────────────

  /**
   * Dual-query helper that mirrors FavoritesService / BookingsService:
   * queries by both customerUid and customerEmail, then dedupes by doc id.
   * Required because legacy records may carry only one of those fields, and
   * because composite where() clauses (e.g. email + status) need a Firestore
   * index that may not exist locally.
   */
  async fetchUserDocs(collectionName, user) {
    const db = this.firestoreService.db();
    const normalizedUid = this.authGuardService.normalizeCustomerUid(user.customerUid);
    const normalizedEmail =
      typeof user.customerEmail === "string" ? user.customerEmail.trim().toLowerCase() : "";

    const queries = [];
    if (normalizedUid) {
      queries.push(db.collection(collectionName).where("customerUid", "==", normalizedUid).get());
    }
    if (normalizedEmail) {
      queries.push(db.collection(collectionName).where("customerEmail", "==", normalizedEmail).get());
    }
    if (queries.length === 0) return [];

    const snapshots = await Promise.all(queries);
    const seen = new Set();
    const docs = [];
    for (const snapshot of snapshots) {
      for (const doc of snapshot.docs) {
        if (!seen.has(doc.id)) {
          seen.add(doc.id);
          docs.push(doc.data());
        }
      }
    }
    return docs;
  }

  async fetchFavoriteMovieIds(user) {
    const docs = await this.fetchUserDocs(FIRESTORE_COLLECTIONS.favorites, user);
    return new Set(
      docs
        .map((data) => Number(data?.movieId))
        .filter((id) => Number.isInteger(id) && id > 0)
    );
  }

  async fetchBookedMovieIds(user) {
    const docs = await this.fetchUserDocs(FIRESTORE_COLLECTIONS.bookings, user);
    return new Set(
      docs
        .filter((data) => data?.status === "confirmed")
        .map((data) => Number(data?.movieId))
        .filter((id) => Number.isInteger(id) && id > 0)
    );
  }

  async fetchRecentlyRecommendedMovieIds(user) {
    const docs = await this.fetchUserDocs(FIRESTORE_COLLECTIONS.recommendationHistory, user);

    const recent = docs
      .sort((a, b) => {
        const aTime = Date.parse(a?.sentAt ?? a?.createdAt ?? "");
        const bTime = Date.parse(b?.sentAt ?? b?.createdAt ?? "");
        return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
      })
      .slice(0, RECOMMENDATION_HISTORY_LOOKBACK);

    const ids = new Set();
    for (const entry of recent) {
      if (Array.isArray(entry?.movieIds)) {
        for (const id of entry.movieIds) {
          const numId = Number(id);
          if (Number.isInteger(numId) && numId > 0) ids.add(numId);
        }
      }
    }
    return ids;
  }

  // ── Internal: candidate shortlisting + strategy execution ──────────────

  /**
   * Builds the candidate pool sent to the ranking strategy.
   *
   * We start with the strictest possible shortlist (active movies, excluding
   * everything the user has touched) and progressively relax exclusions until
   * we have at least one candidate. Order:
   *   1. Active, not favourited / booked / recently recommended  (best)
   *   2. Active, not favourited / booked                         (drop history dedup)
   *   3. Upcoming "coming_soon" titles, not favourited / booked  (next-up picks)
   *   4. Any active title (incl. favourited / booked)            (last resort)
   *
   * Tier 4 guarantees the section is never empty when the catalogue isn't.
   * If the user has already favourited / booked everything we have, we still
   * surface those titles with a "rewatch / based on your love for this" note
   * so the UI never silently shows an empty state.
   *
   * The cap of MAX_RECOMMENDATION_CANDIDATES guarantees we never ship the
   * entire catalogue to the AI provider.
   */
  buildCandidatePool({
    activeMovies,
    upcomingMovies,
    favoriteMovieIds,
    bookedMovieIds,
    recentlyRecommendedIds
  }) {
    const sortByLatest = (list) =>
      [...list].sort((a, b) => {
        const aDate = Date.parse(a?.releaseDate ?? "") || 0;
        const bDate = Date.parse(b?.releaseDate ?? "") || 0;
        return bDate - aDate;
      });

    const filterOut = (list, excludeIds) =>
      list.filter((movie) => !excludeIds.has(Number(movie.id)));

    const userTouchedIds = new Set([...favoriteMovieIds, ...bookedMovieIds]);
    const fullExclusion = new Set([...userTouchedIds, ...recentlyRecommendedIds]);

    const tiers = [
      filterOut(activeMovies, fullExclusion),
      filterOut(activeMovies, userTouchedIds),
      filterOut(upcomingMovies, userTouchedIds),
      [...activeMovies, ...upcomingMovies] // tier 4 — last-resort: include everything
    ];

    for (const tier of tiers) {
      if (tier.length > 0) {
        return sortByLatest(tier).slice(0, MAX_RECOMMENDATION_CANDIDATES);
      }
    }

    return [];
  }

  async runStrategiesWithFallback({ favoriteMovies, bookedMovies, candidates }) {
    let result = null;

    if (this.geminiAdapter.isConfigured()) {
      try {
        result = await this.geminiStrategy.recommend({
          favoriteMovies,
          bookedMovies,
          candidates,
          max: MAX_RECOMMENDATIONS
        });

        if (result.movies.length === 0) {
          this.logger.warn("Gemini returned no usable rankings; falling back to genre strategy");
          result = null;
        }
      } catch (err) {
        this.logger.warn(
          `Gemini strategy failed (${err instanceof Error ? err.message : err}); falling back to genre strategy`
        );
        result = null;
      }
    } else {
      this.logger.warn("GEMINI_API_KEY not set — using genre-based strategy");
    }

    if (!result) {
      result = await this.genreStrategy.recommend({
        favoriteMovies,
        bookedMovies,
        candidates,
        max: MAX_RECOMMENDATIONS
      });
    }

    // Pad with leftover candidates if the strategy returned fewer than the
    // requested count. Avoids a half-empty section when the AI is overly
    // conservative or scores skew low.
    return this.padWithLeftoverCandidates(result, candidates, MAX_RECOMMENDATIONS);
  }

  padWithLeftoverCandidates(result, candidates, max) {
    if (!result || !Array.isArray(result.movies)) return result;
    if (result.movies.length >= max) return result;

    const presentIds = new Set(result.movies.map((m) => Number(m.id)));
    const padded = [...result.movies];
    const reasonsByMovieId = { ...(result.reasonsByMovieId ?? {}) };

    for (const candidate of candidates) {
      if (padded.length >= max) break;
      const id = Number(candidate.id);
      if (presentIds.has(id)) continue;
      padded.push(candidate);
      presentIds.add(id);
      if (!reasonsByMovieId[id]) {
        reasonsByMovieId[id] = "Currently playing — worth checking out.";
      }
    }

    return { ...result, movies: padded, reasonsByMovieId };
  }

  // ── Internal: history persistence ───────────────────────────────────────

  async recordHistory(user, result, source) {
    const db = this.firestoreService.db();
    const historyId = randomUUID();
    const now = new Date().toISOString();

    const movieIds = result.movies.map((m) => Number(m.id)).filter(Number.isInteger);
    const aiReasons = movieIds.map((id) => ({
      movieId: id,
      reason: result.reasonsByMovieId?.[id] ?? ""
    }));

    await db.collection(FIRESTORE_COLLECTIONS.recommendationHistory).doc(historyId).set({
      historyId,
      customerUid: user.customerUid,
      customerEmail: user.customerEmail,
      movieIds,
      aiReasons,
      strategy: result.source,
      source: source ?? RECOMMENDATION_SOURCES.cron,
      sentAt: now,
      createdAt: now
    });
  }
}

decorateClass(RecommendationsService, [Injectable()], [
  FirestoreService,
  MoviesService,
  ProfileNotificationService,
  AuthGuardService,
  GeminiAdapter
]);

export { RecommendationsService };
