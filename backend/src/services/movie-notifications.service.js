import { ConflictException, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { FIRESTORE_COLLECTIONS } from "../common/constants.js";
import { decorateClass } from "../common/nest-metadata.js";
import { FirestoreService } from "../config/firestore.service.js";

/**
 * MovieNotificationsService
 *
 * SRP: Manages per-user subscriptions to showtime notifications for a movie.
 * When a subscriber exists, AdminService triggers an email after scheduling.
 */
class MovieNotificationsService {
  constructor(firestoreService) {
    this.firestoreService = firestoreService;
  }

  collection() {
    return this.firestoreService.db().collection(FIRESTORE_COLLECTIONS.movieNotifications);
  }

  /**
   * Subscribe a user to showtime notifications for a movie.
   * Silently deduplicates — subscribing twice is a no-op.
   */
  async subscribe({ movieId, userId, email, displayName }) {
    const normalizedMovieId = String(movieId);
    const normalizedUserId = typeof userId === "string" ? userId.trim() : "";

    if (!normalizedMovieId || !normalizedUserId) {
      throw new ConflictException("movieId and userId are required");
    }

    // Check for existing subscription
    const existing = await this.collection()
      .where("movieId", "==", normalizedMovieId)
      .where("userId", "==", normalizedUserId)
      .limit(1)
      .get();

    if (!existing.empty) {
      return { alreadySubscribed: true };
    }

    const id = randomUUID();
    await this.collection().doc(id).set({
      id,
      movieId: normalizedMovieId,
      userId: normalizedUserId,
      email: typeof email === "string" ? email.trim() : "",
      displayName: typeof displayName === "string" ? displayName.trim() : "",
      subscribedAt: new Date().toISOString()
    });

    return { subscribed: true };
  }

  /**
   * Returns all subscribers for a given movieId.
   */
  async getSubscribers(movieId) {
    const snapshot = await this.collection()
      .where("movieId", "==", String(movieId))
      .get();

    return snapshot.docs.map((doc) => doc.data());
  }

  /**
   * Removes all notification subscriptions for a movie (called after emails are sent).
   */
  async clearSubscribers(movieId) {
    const snapshot = await this.collection()
      .where("movieId", "==", String(movieId))
      .get();

    if (snapshot.empty) return;

    const batch = this.firestoreService.db().batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

decorateClass(MovieNotificationsService, [Injectable()], [FirestoreService]);

export { MovieNotificationsService };
