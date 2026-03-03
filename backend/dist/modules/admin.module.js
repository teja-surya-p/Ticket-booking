import { Module } from "@nestjs/common";
import { decorateClass } from "../common/nest-metadata.js";
import { AdminController } from "../controllers/admin.controller.js";
import { AdminService } from "../services/admin.service.js";
import { BookingsModule } from "./bookings.module.js";
import { MoviesModule } from "./movies.module.js";

class AdminModule {}

decorateClass(AdminModule, [
  Module({
    imports: [MoviesModule, BookingsModule],
    controllers: [AdminController],
    providers: [AdminService]
  })
]);

export { AdminModule };
