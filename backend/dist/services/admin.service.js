import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { FIRESTORE_COLLECTIONS } from "../common/constants.js";
import { decorateClass } from "../common/nest-metadata.js";
import { FirestoreService } from "../config/firestore.service.js";
import { BookingsService } from "./bookings.service.js";
import { MoviesService } from "./movies.service.js";
import { ProfileNotificationService } from "./profile-notification.service.js";
import { PromoCodesService } from "./promo-codes.service.js";
import { ShowroomsService } from "./showrooms.service.js";
import { ShowtimesService } from "./showtimes.service.js";

/**
 * AdminService
 *
 * SRP: Orchestrates admin-level operations — dashboard stats and showtime
 * scheduling. Delegates persistence to specialised services.
 */
class AdminService {
  constructor(moviesService, bookingsService, showtimesService, showroomsService, profileNotificationService, firestoreService, promoCodesService) {
    this.moviesService = moviesService;
    this.bookingsService = bookingsService;
    this.showtimesService = showtimesService;
    this.showroomsService = showroomsService;
    this.profileNotificationService = profileNotificationService;
    this.firestoreService = firestoreService;
    this.promoCodesService = promoCodesService;
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
   * Also enforces that coming_soon movies cannot be scheduled before their release date.
   *
   * @param {{ movieId: number, showroomId: string, startAt: string }} dto
   */
  async scheduleShowtime(dto) {
    const movie = await this.moviesService.findById(Number(dto?.movieId));

    // Coming soon movies cannot be scheduled before their release date
    if (movie.status === "coming_soon" && movie.releaseDate) {
      const releaseDate = new Date(movie.releaseDate);
      releaseDate.setHours(0, 0, 0, 0);
      const startDate = new Date(dto.startAt);
      if (startDate < releaseDate) {
        throw new BadRequestException(
          `Cannot schedule shows before the movie's release date (${movie.releaseDate})`
        );
      }
    }

    return await this.showtimesService.create(dto);
  }

  /**
   * Returns all upcoming showtimes enriched with movie title and showroom name.
   */
  async getAllShowtimes() {
    const [showtimes, movies, showrooms] = await Promise.all([
      this.showtimesService.findAllUpcoming(),
      this.moviesService.findAll({}),
      this.showroomsService.findAll()
    ]);

    const movieMap = Object.fromEntries(movies.map((m) => [String(m.id), m.title]));
    const showroomMap = Object.fromEntries(showrooms.map((r) => [r.showroomId, r.name]));

    return showtimes.map((st) => ({
      ...st,
      movieTitle: movieMap[String(st.movieId)] ?? "Unknown Movie",
      showroomName: showroomMap[st.showroomId] ?? st.showroomId
    }));
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
    const promoCode = typeof dto?.promoCode === "string" ? dto.promoCode.trim() : "";
    const discountPercent = dto?.discountPercent !== undefined ? dto.discountPercent : null;

    if (!title) throw new BadRequestException("title is required");
    if (!message) throw new BadRequestException("message is required");

    // If a promo code is provided, validate and create it
    let createdPromoCode = null;
    if (promoCode) {
      if (discountPercent === null || discountPercent === "") {
        throw new BadRequestException("discountPercent is required when providing a promo code");
      }
      createdPromoCode = await this.promoCodesService.create({
        code: promoCode,
        discountPercent: Number(discountPercent)
      });
    }

    const usersSnapshot = await this.firestoreService
      .db()
      .collection(FIRESTORE_COLLECTIONS.users)
      .where("promotionsOptIn", "==", true)
      .get();

    const promotion = {
      title,
      message,
      promoCode: createdPromoCode ? createdPromoCode.code : null,
      discountPercent: createdPromoCode ? createdPromoCode.discountPercent : null
    };

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
      promoCode: createdPromoCode ? createdPromoCode.code : null,
      discountPercent: createdPromoCode ? createdPromoCode.discountPercent : null,
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
  FirestoreService,
  PromoCodesService
]);

export { AdminService };
