import { Injectable } from "@nestjs/common";
import { decorateClass } from "../common/nest-metadata.js";
import { BookingsService } from "./bookings.service.js";
import { MoviesService } from "./movies.service.js";
import { ShowtimesService } from "./showtimes.service.js";

/**
 * AdminService
 *
 * SRP: Orchestrates admin-level operations — dashboard stats and showtime
 * scheduling. Delegates persistence to specialised services.
 */
class AdminService {
  constructor(moviesService, bookingsService, showtimesService) {
    this.moviesService = moviesService;
    this.bookingsService = bookingsService;
    this.showtimesService = showtimesService;
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
}

decorateClass(AdminService, [Injectable()], [MoviesService, BookingsService, ShowtimesService]);

export { AdminService };
