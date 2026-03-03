import { Injectable } from "@nestjs/common";
import { decorateClass } from "../common/nest-metadata.js";
import { BookingsService } from "./bookings.service.js";
import { MoviesService } from "./movies.service.js";

class AdminService {
  constructor(moviesService, bookingsService) {
    this.moviesService = moviesService;
    this.bookingsService = bookingsService;
  }

  async getDashboardStats() {
    const movies = await this.moviesService.findAll({});
    const currentlyRunning = movies.filter((movie) => movie.status === "currently_running").length;
    const comingSoon = movies.filter((movie) => movie.status === "coming_soon").length;

    return {
      totalMovies: movies.length,
      currentlyRunning,
      comingSoon,
      revenue: await this.bookingsService.getRevenue(),
      activeUsers: 0
    };
  }
}

decorateClass(AdminService, [Injectable()], [MoviesService, BookingsService]);

export { AdminService };
