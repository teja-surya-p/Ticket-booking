import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { FIRESTORE_COLLECTIONS } from "../common/constants.js";
import { decorateClass } from "../common/nest-metadata.js";
import { FirestoreService } from "../config/firestore.service.js";
import { BookingsService } from "./bookings.service.js";
import { MoviesService } from "./movies.service.js";
import { ProfileNotificationService } from "./profile-notification.service.js";
import { ShowroomsService } from "./showrooms.service.js";
import { ShowtimesService } from "./showtimes.service.js";

/**
 * AdminService
 *
 * SRP: Orchestrates admin-level operations — dashboard stats and showtime
 * scheduling. Delegates persistence to specialised services.
 */
class AdminService {
  constructor(moviesService, bookingsService, showtimesService, showroomsService, profileNotificationService, firestoreService) {
    this.moviesService = moviesService;
    this.bookingsService = bookingsService;
    this.showtimesService = showtimesService;
    this.showroomsService = showroomsService;
    this.profileNotificationService = profileNotificationService;
    this.firestoreService = firestoreService;
  }

  async getDashboardStats() {
    const movies = await this.moviesService.findAll({});
    const currentlyRunning = movies.filter((m) => m.status === "currently_running").length;
    const comingSoon = movies.filter((m) => m.status === "coming_soon").length;

    return {
      totalMovies: movies.length,
      currentlyRunning,
      comingSoon,
      revenue: await this.bookingsService.getRevenue(),
      activeUsers: 0
    };
  }

  /**
   * Schedules a showtime for a movie.
   * AdminService validates the movie exists (SRP: movie-existence check belongs
   * to MoviesService); ShowtimesService handles conflict detection and persistence.
   *
   * @param {{ movieId: number, showroomId: string, startAt: string }} dto
   */
  async scheduleShowtime(dto) {
    await this.moviesService.findById(Number(dto?.movieId));
    return await this.showtimesService.create(dto);
  }

  async getAvailableShowrooms(startAt) {
    if (typeof startAt !== "string" || startAt.trim().length === 0) {
      throw new BadRequestException("startAt query parameter is required");
    }
    const occupiedIds = new Set(await this.showtimesService.findOccupiedShowroomIds(startAt));
    const allShowrooms = await this.showroomsService.findAll();
    return allShowrooms.filter((room) => !occupiedIds.has(room.showroomId));
  }

  async sendPromotion(dto) {
    const title = typeof dto?.title === "string" ? dto.title.trim() : "";
    const message = typeof dto?.message === "string" ? dto.message.trim() : "";

    if (!title) throw new BadRequestException("title is required");
    if (!message) throw new BadRequestException("message is required");

    const usersSnapshot = await this.firestoreService
      .db()
      .collection(FIRESTORE_COLLECTIONS.users)
      .where("promotionsOptIn", "==", true)
      .get();

    const promotion = { title, message };

    await Promise.all(
      usersSnapshot.docs.map((doc) => {
        const user = doc.data();
        return this.profileNotificationService.sendPromotionEmail(
          user.email,
          user.displayName ?? user.email,
          promotion
        );
      })
    );

    const promotionId = randomUUID();
    const now = new Date().toISOString();
    const record = {
      promotionId,
      title,
      message,
      sentAt: now,
      recipientCount: usersSnapshot.size
    };

    await this.firestoreService
      .db()
      .collection(FIRESTORE_COLLECTIONS.promotions)
      .doc(promotionId)
      .set(record);

    return { sentCount: usersSnapshot.size, promotionId };
  }
}

decorateClass(AdminService, [Injectable()], [
  MoviesService,
  BookingsService,
  ShowtimesService,
  ShowroomsService,
  ProfileNotificationService,
  FirestoreService
]);

export { AdminService };
