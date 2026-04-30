import { ConflictException, Injectable } from "@nestjs/common";
import { FIRESTORE_COLLECTIONS, SEAT_LOCK_DURATION_MS } from "../common/constants.js";
import { decorateClass } from "../common/nest-metadata.js";
import { FirestoreService } from "../config/firestore.service.js";

/**
 * SeatLocksService
 *
 * SRP: Manages ephemeral seat locks — acquiring, releasing, querying, and
 *      cleaning up timed locks in the `seatLocks` Firestore collection.
 *
 * Each lock document represents a single seat hold (5 minutes). Acquisition
 * uses a Firestore transaction to prevent race conditions when multiple users
 * attempt to lock the same seat simultaneously.
 *
 * Document ID format: `{movieId}_{encodedShowtime}_{seatId}`
 *   e.g. "1_2025-05-01T14%3A00%3A00.000Z_3-5"
 *
 * Document shape:
 * {
 *   lockId: string,        // same as doc ID
 *   movieId: number,
 *   showtime: string,      // ISO 8601
 *   seatId: string,        // e.g. "3-5"
 *   lockedBy: string,      // Firebase UID or guestSessionId
 *   isGuest: boolean,
 *   lockStartedAt: string, // ISO 8601
 *   lockExpiresAt: string  // ISO 8601 = lockStartedAt + SEAT_LOCK_DURATION_MS
 * }
 */
class SeatLocksService {
  constructor(firestoreService) {
    this.firestoreService = firestoreService;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  lockCollection() {
    return this.firestoreService.db().collection(FIRESTORE_COLLECTIONS.seatLocks);
  }

  /**
   * Builds a Firestore-safe document ID for a seat lock.
   * Colons and dots in the ISO showtime string are percent-encoded.
   */
  buildLockDocId(movieId, showtime, seatId) {
    const encodedShowtime = String(showtime).replace(/:/g, "%3A").replace(/\./g, "%2E");
    return `${movieId}_${encodedShowtime}_${seatId}`;
  }

  // ── Core lock operations ─────────────────────────────────────────────────

  /**
   * Atomically acquires a seat lock using a Firestore transaction.
   *
   * Rules:
   *   - If no lock exists → create it.
   *   - If an expired lock exists (any owner) → overwrite it.
   *   - If a valid (non-expired) lock exists owned by the same `lockedBy` → renew it.
   *   - If a valid lock exists owned by a different user → throw ConflictException.
   *
   * Returns { seatId, lockedBy, lockExpiresAt }.
   */
  async acquireLock(movieId, showtime, seatId, lockedBy, isGuest) {
    const docId = this.buildLockDocId(movieId, showtime, seatId);
    const docRef = this.lockCollection().doc(docId);
    const db = this.firestoreService.db();

    let result;

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      const now = new Date();

      if (snap.exists) {
        const data = snap.data();
        const isExpired = new Date(data.lockExpiresAt) <= now;

        if (!isExpired && data.lockedBy !== lockedBy) {
          throw new ConflictException(`Seat ${seatId} is already locked by another user`);
        }
        // Expired or same owner — allow overwrite / renewal
      }

      const lockStartedAt = now.toISOString();
      const lockExpiresAt = new Date(now.getTime() + SEAT_LOCK_DURATION_MS).toISOString();

      const lockDoc = {
        lockId: docId,
        movieId: Number(movieId),
        showtime: String(showtime),
        seatId: String(seatId),
        lockedBy: String(lockedBy),
        isGuest: isGuest === true,
        lockStartedAt,
        lockExpiresAt
      };

      tx.set(docRef, lockDoc);
      result = { seatId, lockedBy, lockExpiresAt };
    });

    return result;
  }

  /**
   * Releases a seat lock only if the caller owns it or if it has expired.
   * Silently succeeds if the document does not exist.
   */
  async releaseLock(movieId, showtime, seatId, lockedBy) {
    const docId = this.buildLockDocId(movieId, showtime, seatId);
    const docRef = this.lockCollection().doc(docId);
    const snap = await docRef.get();

    if (!snap.exists) {
      return { seatId, released: false };
    }

    const data = snap.data();
    const isExpired = new Date(data.lockExpiresAt) <= new Date();

    if (isExpired || data.lockedBy === lockedBy) {
      await docRef.delete();
      return { seatId, released: true };
    }

    // Not owner and not expired — do not release
    return { seatId, released: false };
  }

  /**
   * Returns a map of all non-expired locks for a given movie+showtime.
   * Result: { [seatId]: { lockedBy, lockExpiresAt, isGuest } }
   */
  async getLocksForShowtime(movieId, showtime) {
    const now = new Date().toISOString();

    // Query by both number and string movieId to match existing booking patterns
    const [numSnap, strSnap] = await Promise.all([
      this.lockCollection()
        .where("movieId", "==", Number(movieId))
        .where("showtime", "==", String(showtime))
        .get(),
      this.lockCollection()
        .where("movieId", "==", String(movieId))
        .where("showtime", "==", String(showtime))
        .get()
    ]);

    const seen = new Set();
    const result = {};

    for (const snap of [numSnap, strSnap]) {
      for (const doc of snap.docs) {
        if (seen.has(doc.id)) continue;
        seen.add(doc.id);

        const data = doc.data();
        // Filter out expired locks
        if (data.lockExpiresAt > now) {
          result[data.seatId] = {
            lockedBy: data.lockedBy,
            lockExpiresAt: data.lockExpiresAt,
            isGuest: data.isGuest === true
          };
        }
      }
    }

    return result;
  }

  /**
   * Verifies that each seat in `seatIds` has a valid (non-expired) lock owned
   * by either `customerUid` or `guestSessionId`.
   *
   * Throws ConflictException with a descriptive message if any seat fails.
   */
  async verifyLockOwnership(seatIds, movieId, showtime, customerUid, guestSessionId) {
    const now = new Date();

    // Read all lock docs in parallel
    const docRefs = seatIds.map((seatId) => {
      const docId = this.buildLockDocId(movieId, showtime, seatId);
      return { seatId, ref: this.lockCollection().doc(docId) };
    });

    const snaps = await Promise.all(docRefs.map(({ ref }) => ref.get()));

    for (let i = 0; i < seatIds.length; i++) {
      const seatId = seatIds[i];
      const snap = snaps[i];

      if (!snap.exists) {
        throw new ConflictException(
          `Seat ${seatId} is no longer locked — your session may have expired. Please re-select your seats.`
        );
      }

      const data = snap.data();
      const isExpired = new Date(data.lockExpiresAt) <= now;

      if (isExpired) {
        throw new ConflictException(
          `Your lock on seat ${seatId} has expired. Please re-select your seats.`
        );
      }

      const isOwner =
        (customerUid && data.lockedBy === customerUid) ||
        (guestSessionId && data.lockedBy === guestSessionId);

      if (!isOwner) {
        throw new ConflictException(
          `Seat ${seatId} is locked by another user. Please choose a different seat.`
        );
      }
    }
  }

  /**
   * Releases all locks for a given user (UID or guestSessionId) on a specific
   * movie+showtime. Used after a booking is confirmed to clean up locks.
   * Fire-and-forget safe.
   */
  async releaseLocksForUser(lockedBy, movieId, showtime) {
    const [numSnap, strSnap] = await Promise.all([
      this.lockCollection()
        .where("movieId", "==", Number(movieId))
        .where("showtime", "==", String(showtime))
        .where("lockedBy", "==", String(lockedBy))
        .get(),
      this.lockCollection()
        .where("movieId", "==", String(movieId))
        .where("showtime", "==", String(showtime))
        .where("lockedBy", "==", String(lockedBy))
        .get()
    ]);

    const seen = new Set();
    const toDelete = [];

    for (const snap of [numSnap, strSnap]) {
      for (const doc of snap.docs) {
        if (!seen.has(doc.id)) {
          seen.add(doc.id);
          toDelete.push(doc.ref);
        }
      }
    }

    if (toDelete.length === 0) return;

    const BATCH_SIZE = 500;
    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
      const batch = this.firestoreService.db().batch();
      toDelete.slice(i, i + BATCH_SIZE).forEach((ref) => batch.delete(ref));
      await batch.commit();
    }
  }

  /**
   * Deletes all expired lock documents across the entire collection.
   * Called by the cleanup cron every 5 minutes.
   * Returns the count of deleted documents.
   */
  async cleanupExpiredLocks() {
    const now = new Date().toISOString();
    const snapshot = await this.lockCollection()
      .where("lockExpiresAt", "<", now)
      .get();

    if (snapshot.empty) return 0;

    const BATCH_SIZE = 500;
    let deleted = 0;

    for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
      const batch = this.firestoreService.db().batch();
      snapshot.docs.slice(i, i + BATCH_SIZE).forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      deleted += Math.min(BATCH_SIZE, snapshot.docs.length - i);
    }

    return deleted;
  }
}

decorateClass(SeatLocksService, [Injectable()], [FirestoreService]);

export { SeatLocksService };
