import { Module } from "@nestjs/common";
import { decorateClass } from "../common/nest-metadata.js";
import { MoviesController } from "../controllers/movies.controller.js";
import { AdminAccessService } from "../services/admin-access.service.js";
import { MovieNotificationsService } from "../services/movie-notifications.service.js";
import { MoviesService } from "../services/movies.service.js";
import { ShowtimesModule } from "./showtimes.module.js";

class MoviesModule {}

decorateClass(MoviesModule, [
  Module({
    imports: [ShowtimesModule],
    controllers: [MoviesController],
    providers: [MoviesService, MovieNotificationsService, AdminAccessService],
    exports: [MoviesService, MovieNotificationsService]
  })
]);

export { MoviesModule };
