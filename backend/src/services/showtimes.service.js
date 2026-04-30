import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { FIRESTORE_COLLECTIONS } from "../common/constants.js";
import { decorateClass } from "../common/nest-metadata.js";
import { FirestoreService } from "../config/firestore.service.js";
import { toShowtimeEntity } from "../entities/showtime.entity.js";

/**
 * ShowtimesService
 *
 * SRP: Single responsibility — manage showtime schedules in Firestore.
 *      Movie-existence validation is the caller's responsibility (AdminService),
 *      keeping this service focused solely on scheduling logic.
 *
 * DIP: Depends on FirestoreService abstraction, not firebase-admin directly.
 */
class ShowtimesService {
  constructor(firestoreService) {
    this.firestoreService = firestoreService;
  }

  async onModuleInit() {
    await this.cleanupOrphanedShowtimes();
    await this.seedShowtimesIfEmpty();
  }

  /**
   * Deletes every showtime whose movieId does not match any existing movie.
   * Runs at startup so stale showtimes left by deleted movies never block scheduling.
   */
  async cleanupOrphanedShowtimes() {
    try {
      const [showtimesSnap, moviesSnap] = await Promise.all([
        this.collection().get(),
        this.firestoreService.db().collection(FIRESTORE_COLLECTIONS.movies).get()
      ]);

      if (showtimesSnap.empty) return;

      // Build the set of valid movie IDs from Firestore
      const validMovieIds = new Set();
      for (const doc of moviesSnap.docs) {
        const rawId = Number(doc.data()?.id);
        if (Number.isInteger(rawId) && rawId > 0) {
          validMovieIds.add(rawId);
        }
      }

      const orphanedDocs = showtimesSnap.docs.filter((doc) => {
        const movieId = Number(doc.data()?.movieId);
        return !Number.isInteger(movieId) || !validMovieIds.has(movieId);
      });

      if (orphanedDocs.length === 0) return;

      // Delete in batches of 500 (Firestore batch limit)
      for (let i = 0; i < orphanedDocs.length; i += 500) {
        const batch = this.firestoreService.db().batch();
        orphanedDocs.slice(i, i + 500).forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }

      console.log(`[ShowtimesService] Cleaned up ${orphanedDocs.length} orphaned showtime(s).`);
    } catch (err) {
      // Non-fatal: log and continue so a cleanup failure never blocks server startup
      console.error("[ShowtimesService] Orphan cleanup failed:", err?.message ?? err);
    }
  }

  async seedShowtimesIfEmpty() {
    const snapshot = await this.collection().limit(1).get();
    if (!snapshot.empty) {
      return;
    }

    // Only seed for movies that actually exist
    const moviesSnap = await this.firestoreService.db()
      .collection(FIRESTORE_COLLECTIONS.movies)
      .get();
    const existingMovieIds = new Set(
      moviesSnap.docs
        .map((doc) => Number(doc.data()?.id))
        .filter((id) => Number.isInteger(id) && id > 0)
    );

    const now = new Date();
    // Generate showtimes for the next 3 days at 11:00, 14:00, 18:00 UTC
    const slots = [
      { hour: 11, minute: 0 },
      { hour: 14, minute: 0 },
      { hour: 18, minute: 0 }
    ];

    // movie 1 → showroom-1, movie 2 → showroom-2, movie 3 → showroom-3
    const movieRooms = [
      { movieId: 1, showroomId: "showroom-1" },
      { movieId: 2, showroomId: "showroom-2" },
      { movieId: 3, showroomId: "showroom-3" }
    ].filter(({ movieId }) => existingMovieIds.has(movieId));

    if (movieRooms.length === 0) return;

    const batch = this.firestoreService.db().batch();
    const createdAt = now.toISOString();

    for (let dayOffset = 1; dayOffset <= 3; dayOffset++) {
      for (const slot of slots) {
        for (const { movieId, showroomId } of movieRooms) {
          const date = new Date(now);
          date.setUTCDate(date.getUTCDate() + dayOffset);
          date.setUTCHours(slot.hour, slot.minute, 0, 0);
          const startAt = date.toISOString();
          const showtimeId = randomUUID();
          const entity = toShowtimeEntity({ showtimeId, movieId, showroomId, startAt, createdAt });
          const docRef = this.collection().doc(showtimeId);
          batch.set(docRef, entity);
        }
      }
    }

    await batch.commit();
  }

  /**
   * Creates a showtime. Conflict check: same showroomId + same startAt.
   * Also enforces max 4 showtimes per movie per calendar day.
   * The caller (AdminService) is responsible for validating that the movie exists.
   *
   * @param {{ movieId: number, showroomId: string, startAt: string }} dto
   */
  async create(dto) {
    const movieId = this.normalizeMovieId(dto?.movieId);
    const showroomId = this.normalizeShowroomId(dto?.showroomId);
    const startAt = this.normalizeStartAt(dto?.startAt);

    // Prevent scheduling shows on past dates
    const showDate = new Date(startAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (showDate < today) {
      throw new BadRequestException("Cannot schedule shows for past dates");
    }

    const conflict = await this.findByShowroomAndStartAt(showroomId, startAt);
    if (conflict) {
      // Check whether the conflicting showtime's movie still exists.
      // If the movie was deleted without cleaning up its showtimes (e.g., due to a
      // prior storage-deletion error), the showtime is orphaned and should be removed.
      const movieStillExists = await this.movieExists(conflict.movieId);
      if (!movieStillExists) {
        // Auto-heal: delete the orphaned showtime and continue scheduling.
        await this.collection().doc(conflict.showtimeId).delete();
      } else {
        throw new ConflictException(
          `Showroom "${showroomId}" already has a showtime at ${startAt}`
        );
      }
    }

    const dayStr = startAt.slice(0, 10);
    const movieDaySnapshot = await this.collection()
      .where("movieId", "==", movieId)
      .get();
    const dayCount = movieDaySnapshot.docs.filter((doc) => {
      const st = doc.data().startAt;
      return typeof st === "string" && st.startsWith(dayStr);
    }).length;
    if (dayCount >= 4) {
      throw new ConflictException(
        `Movie already has 4 showtimes on ${dayStr}, which is the daily maximum`
      );
    }

    const showtimeId = randomUUID();
    const now = new Date().toISOString();
    const showtime = toShowtimeEntity({ showtimeId, movieId, showroomId, startAt, createdAt: now });

    await this.collection().doc(showtimeId).set(showtime);
    return showtime;
  }

  async findByMovieId(movieId) {
    const normalizedId = this.normalizeMovieId(movieId);
    const snapshot = await this.collection()
      .where("movieId", "==", normalizedId)
      .get();
    const docs = snapshot.docs.map((doc) => toShowtimeEntity(doc.data()));
    return docs.sort((a, b) => a.startAt.localeCompare(b.startAt));
  }

  async findByShowroomId(showroomId) {
    const normalizedId = this.normalizeShowroomId(showroomId);
    const snapshot = await this.collection()
      .where("showroomId", "==", normalizedId)
      .get();
    const docs = snapshot.docs.map((doc) => toShowtimeEntity(doc.data()));
    return docs.sort((a, b) => a.startAt.localeCompare(b.startAt));
  }

  async findOccupiedShowroomIds(startAt) {
    const normalized = this.normalizeStartAt(startAt);
    const snapshot = await this.collection()
      .where("startAt", "==", normalized)
      .get();
    return snapshot.docs.map((doc) => doc.data().showroomId);
  }

  async findAllUpcoming() {
    const now = new Date().toISOString();
    const snapshot = await this.collection()
      .where("startAt", ">=", now)
      .orderBy("startAt")
      .get();
    return snapshot.docs.map((doc) => toShowtimeEntity(doc.data()));
  }

  async findById(showtimeId) {
    if (!showtimeId || typeof showtimeId !== "string") return null;
    const snap = await this.collection().doc(showtimeId.trim()).get();
    return snap.exists ? toShowtimeEntity(snap.data()) : null;
  }

  async deleteById(showtimeId) {
    if (!showtimeId || typeof showtimeId !== "string") {
      throw new BadRequestException("showtimeId is required");
    }
    const ref = this.collection().doc(showtimeId.trim());
    const snap = await ref.get();
    if (!snap.exists) {
      throw new BadRequestException(`Showtime "${showtimeId}" not found`);
    }
    await ref.delete();
  }

  async deleteByMovieId(movieId) {
    const normalizedMovieId = this.normalizeMovieId(movieId);
    const snapshot = await this.collection()
      .where("movieId", "==", normalizedMovieId)
      .get();

    if (snapshot.empty) {
      return;
    }

    const batch = this.firestoreService.db().batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }

  async findByMovieAndStartAt(movieId, startAt) {
    const normalizedMovieId = this.normalizeMovieId(movieId);
    const normalizedStartAt = this.normalizeStartAt(startAt);
    const snapshot = await this.collection()
      .where("movieId", "==", normalizedMovieId)
      .where("startAt", "==", normalizedStartAt)
      .limit(1)
      .get();
    return snapshot.empty ? null : toShowtimeEntity(snapshot.docs[0].data());
  }

  async findByShowroomAndStartAt(showroomId, startAt) {
    const snapshot = await this.collection()
      .where("showroomId", "==", showroomId)
      .where("startAt", "==", startAt)
      .limit(1)
      .get();
    return snapshot.empty ? null : toShowtimeEntity(snapshot.docs[0].data());
  }

  async movieExists(movieId) {
    try {
      const normalizedId = this.normalizeMovieId(movieId);
      // Check by stored "id" field (movies are stored with an integer id field)
      const snapshot = await this.firestoreService.db()
        .collection(FIRESTORE_COLLECTIONS.movies)
        .where("id", "==", normalizedId)
        .limit(1)
        .get();
      if (!snapshot.empty) return true;
      // Fallback: check by document ID (movies use String(id) as doc ID)
      const docSnap = await this.firestoreService.db()
        .collection(FIRESTORE_COLLECTIONS.movies)
        .doc(String(normalizedId))
        .get();
      return docSnap.exists;
    } catch {
      // If we can't determine, assume the movie exists to avoid false positives
      return true;
    }
  }

  collection() {
    return this.firestoreService.db().collection(FIRESTORE_COLLECTIONS.showtimes);
  }

  normalizeMovieId(value) {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException("movieId must be a positive integer");
    }
    return id;
  }

  normalizeShowroomId(value) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new BadRequestException("showroomId is required");
    }
    return value.trim();
  }

  normalizeStartAt(value) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new BadRequestException("startAt is required");
    }
    const date = new Date(value.trim());
    if (isNaN(date.getTime())) {
      throw new BadRequestException("startAt must be a valid ISO 8601 timestamp");
    }
    return date.toISOString();
  }
}

decorateClass(ShowtimesService, [Injectable()], [FirestoreService]);

export { ShowtimesService };
