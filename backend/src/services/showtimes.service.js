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

    const conflict = await this.findByShowroomAndStartAt(showroomId, startAt);
    if (conflict) {
      throw new ConflictException(
        `Showroom "${showroomId}" already has a showtime at ${startAt}`
      );
    }

    const dayStart = startAt.slice(0, 10) + "T00:00:00.000Z";
    const dayEnd = startAt.slice(0, 10) + "T23:59:59.999Z";
    const daySnapshot = await this.collection()
      .where("movieId", "==", movieId)
      .where("startAt", ">=", dayStart)
      .where("startAt", "<=", dayEnd)
      .get();
    if (daySnapshot.size >= 4) {
      throw new ConflictException(
        `Movie already has 4 showtimes on ${startAt.slice(0, 10)}, which is the daily maximum`
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
      .orderBy("startAt")
      .get();
    return snapshot.docs.map((doc) => toShowtimeEntity(doc.data()));
  }

  async findByShowroomAndStartAt(showroomId, startAt) {
    const snapshot = await this.collection()
      .where("showroomId", "==", showroomId)
      .where("startAt", "==", startAt)
      .limit(1)
      .get();
    return snapshot.empty ? null : toShowtimeEntity(snapshot.docs[0].data());
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
