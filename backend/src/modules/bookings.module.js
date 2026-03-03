import { Module } from "@nestjs/common";
import { decorateClass } from "../common/nest-metadata.js";
import { BookingsController } from "../controllers/bookings.controller.js";
import { BookingsService } from "../services/bookings.service.js";
import { MoviesModule } from "./movies.module.js";

class BookingsModule {}

decorateClass(BookingsModule, [
  Module({
    imports: [MoviesModule],
    controllers: [BookingsController],
    providers: [BookingsService],
    exports: [BookingsService]
  })
]);

export { BookingsModule };
