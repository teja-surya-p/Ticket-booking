import { ConflictException, Injectable, BadRequestException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { FIRESTORE_COLLECTIONS } from "../common/constants.js";
import { decorateClass } from "../common/nest-metadata.js";
import { FirestoreService } from "../config/firestore.service.js";
import { MoviesService } from "./movies.service.js";

class ShowsService {
  constructor(firestoreService, moviesService) {
    this.firestoreService = firestoreService;
    this.moviesService = moviesService;
  }

  collection() {
    return this.firestoreService.db().collection(FIRESTORE_COLLECTIONS.shows);
  }

  async listByMovie(movieId) {
    const snapshot = await this.collection().where("movieId", "==", Number(movieId)).get();
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async createShow(dto) {
    const movieId = Number(dto.movieId);
    if (!Number.isFinite(movieId) || movieId <= 0) {
      throw new BadRequestException("movieId is required and must be a positive number");
    }

    const showtime = typeof dto.showtime === "string" ? dto.showtime.trim() : "";
    if (showtime.length === 0) {
      throw new BadRequestException("showtime (ISO string) is required");
    }

    const showroomId = typeof dto.showroomId === "string" && dto.showroomId.trim().length > 0 ? dto.showroomId.trim() : null;
    if (!showroomId) {
      throw new BadRequestException("showroomId is required");
    }

    // Ensure movie exists
    await this.moviesService.findById(movieId);

    // Prevent scheduling conflicts: same showroom and exact same showtime
    const conflictSnapshot = await this.collection()
      .where("showroomId", "==", showroomId)
      .where("showtime", "==", showtime)
      .limit(1)
      .get();

    if (!conflictSnapshot.empty) {
      throw new ConflictException("Scheduling conflict: the selected showroom already has a show at that time");
    }

    const showId = randomUUID();
    const showtimeKey = `${showtime}::${showroomId}`;
    const record = {
      showId,
      movieId,
      showtime,
      showroomId,
      showtimeKey,
      createdAt: new Date().toISOString()
    };

    await this.collection().doc(showId).set(record);

    // Append the showtimeKey into the movie document's showtimes array for backward compatibility
    const movieDocRef = await this.moviesService.findMovieDocRefById(movieId);
    if (movieDocRef) {
      const movieSnapshot = await movieDocRef.get();
      const existing = movieSnapshot.exists ? movieSnapshot.data() : {};
      const existingShowtimes = Array.isArray(existing.showtimes) ? existing.showtimes : [];
      if (!existingShowtimes.includes(showtimeKey)) {
        existingShowtimes.push(showtimeKey);
        await movieDocRef.set({ showtimes: existingShowtimes }, { merge: true });
      }
    }

    return record;
  }
}

decorateClass(ShowsService, [Injectable()], [FirestoreService, MoviesService]);

export { ShowsService };
