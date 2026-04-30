import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { FIRESTORE_COLLECTIONS } from "../common/constants.js";
import { decorateClass } from "../common/nest-metadata.js";
import { FirestoreService } from "../config/firestore.service.js";
import { MoviesService } from "./movies.service.js";
import { ProfileNotificationService } from "./profile-notification.service.js";
import { GenreBasedRecommendationStrategy } from "./recommendation.strategy.js";

/**
 * RecommendationsService
 *
 * SRP: Orchestrates the full recommendation pipeline — fetching user data,
 * running the pluggable strategy, calling the email adapter, and persisting
 * history. It delegates:
 *   - Algorithm logic  → RecommendationStrategy (Strategy Pattern)
 *   - Email delivery   → ProfileNotificationService (Adapter Pattern)
 *   - Persistence      → FirestoreService
 */
class RecommendationsService {
  constructor(firestoreService, moviesService, profileNotificationService) {
    this.firestoreService = firestoreService;
    this.moviesService = moviesService;
    this.profileNotificationService = profileNotificationService;

    // Strategy Pattern: swap this line to change the recommendation algorithm
    this.strategy = new GenreBasedRecommendationStrategy();
  }

  /**
   * Generates and sends personalised movie recommendations to every eligible
   * user. A user is eligible when:
   *   - Their account status is "Active"
   *   - They have opted into promotions/recommendations (promotionsOptIn: true)
   *   - They have at least one favourited movie (provides genre signals)
   *
   * For each eligible user, recommended movies:
   *   - Are currently_running
   *   - Are not already in the user's favourites
   *   - Are not already booked by the user (confirmed bookings)
   *   - Have not been recommended in the 3 most recent history entries
   *
   * @returns {{ sent: number, skipped: number, failed: number }}
   */
  async sendRecommendationsToAllUsers() {
    const db = this.firestoreService.db();

    // 1. Fetch all Active users
    const usersSnap = await db
      .collection(FIRESTORE_COLLECTIONS.users)
      .where("status", "==", "Active")
      .get();

    // 2. Fetch all currently_running movies once (shared across users)
    const allMovies = await this.moviesService.findAll({ status: "currently_running" });

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const userDoc of usersSnap.docs) {
      const user = userDoc.data();
      const userUid = userDoc.id;

      // a. Must have an email address
      if (typeof user.email !== "string" || user.email.trim().length === 0) {
        skipped++;
        continue;
      }

      // b. Must have opted in to recommendations/promotions
      if (user.promotionsOptIn !== true) {
        skipped++;
        continue;
      }

      try {
        // c. Fetch this user's favourite movie IDs
        const favSnap = await db
          .collection(FIRESTORE_COLLECTIONS.favorites)
          .where("customerEmail", "==", user.email)
          .get();

        const favoriteMovieIds = new Set(
          favSnap.docs
            .map((d) => {
              const id = Number(d.data().movieId);
              return Number.isInteger(id) && id > 0 ? id : null;
            })
            .filter(Boolean)
        );

        // d. Skip if no favourites — no genre signal to base recommendations on
        if (favoriteMovieIds.size === 0) {
          skipped++;
          continue;
        }

        // e. Fetch confirmed booking movie IDs for this user
        const bookingSnap = await db
          .collection(FIRESTORE_COLLECTIONS.bookings)
          .where("customerEmail", "==", user.email)
          .where("status", "==", "confirmed")
          .get();

        const bookedMovieIds = new Set(
          bookingSnap.docs
            .map((d) => {
              const id = Number(d.data().movieId);
              return Number.isInteger(id) && id > 0 ? id : null;
            })
            .filter(Boolean)
        );

        // f. Fetch recommendation history to avoid repeating recent suggestions
        const historySnap = await db
          .collection(FIRESTORE_COLLECTIONS.recommendationHistory)
          .where("customerEmail", "==", user.email)
          .get();

        // Sort in memory to avoid needing a Firestore composite index
        const recentHistory = historySnap.docs
          .map((d) => d.data())
          .sort((a, b) => {
            const aTime = Date.parse(a.sentAt ?? "");
            const bTime = Date.parse(b.sentAt ?? "");
            return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
          })
          .slice(0, 3);

        const recentlyRecommendedIds = new Set();
        for (const entry of recentHistory) {
          if (Array.isArray(entry.movieIds)) {
            for (const id of entry.movieIds) {
              const numId = Number(id);
              if (Number.isInteger(numId) && numId > 0) {
                recentlyRecommendedIds.add(numId);
              }
            }
          }
        }

        // g. Build the full exclusion set
        const excludeMovieIds = new Set([
          ...favoriteMovieIds,
          ...bookedMovieIds,
          ...recentlyRecommendedIds
        ]);

        // h. Resolve the favourite movie objects (needed for genre extraction)
        const favoriteMovieIdArray = Array.from(favoriteMovieIds);
        const favoriteMovies = allMovies.filter((m) => favoriteMovieIdArray.includes(m.id));

        // i. Run the recommendation strategy
        const recommendations = this.strategy.recommend({
          favoriteMovies,
          allMovies,
          excludeMovieIds
        });

        // j. Skip if strategy found nothing to recommend
        if (recommendations.length === 0) {
          skipped++;
          continue;
        }

        // k. Send recommendation email via the email adapter
        await this.profileNotificationService.sendRecommendationEmail(
          { uid: userUid, email: user.email, displayName: user.displayName },
          recommendations
        );

        // l. Persist history so future runs can avoid re-recommending these movies
        const historyId = randomUUID();
        const now = new Date().toISOString();
        await db.collection(FIRESTORE_COLLECTIONS.recommendationHistory).doc(historyId).set({
          historyId,
          customerUid: userUid,
          customerEmail: user.email,
          movieIds: recommendations.map((m) => m.id),
          sentAt: now
        });

        sent++;
      } catch (err) {
        console.error(
          `[RecommendationsService] Failed to process recommendations for ${user.email}:`,
          err instanceof Error ? err.message : err
        );
        failed++;
      }
    }

    console.log(
      `[RecommendationsService] sendRecommendationsToAllUsers complete — sent: ${sent}, skipped: ${skipped}, failed: ${failed}`
    );

    return { sent, skipped, failed };
  }
}

decorateClass(RecommendationsService, [Injectable()], [
  FirestoreService,
  MoviesService,
  ProfileNotificationService
]);

export { RecommendationsService };
