import { Module } from "@nestjs/common";
import { decorateClass } from "../common/nest-metadata.js";
import { AdminController } from "../controllers/admin.controller.js";
import { AdminService } from "../services/admin.service.js";
import { ProfileNotificationService } from "../services/profile-notification.service.js";
import { BookingsModule } from "./bookings.module.js";
import { MoviesModule } from "./movies.module.js";
import { ShowroomsModule } from "./showrooms.module.js";
import { ShowtimesModule } from "./showtimes.module.js";

class AdminModule {}

decorateClass(AdminModule, [
  Module({
    imports: [MoviesModule, BookingsModule, ShowtimesModule, ShowroomsModule],
    controllers: [AdminController],
    providers: [AdminService, ProfileNotificationService]
  })
]);

export { AdminModule };
