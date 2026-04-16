import { Module } from "@nestjs/common";
import { decorateClass } from "../common/nest-metadata.js";
import { BookingsController } from "../controllers/bookings.controller.js";
import { BookingsService } from "../services/bookings.service.js";
import { DefaultPricingStrategy } from "../services/pricing.strategy.js";
import { MoviesModule } from "./movies.module.js";
import { PromoCodesModule } from "./promo-codes.module.js";
import { ShowroomsModule } from "./showrooms.module.js";
import { ShowtimesModule } from "./showtimes.module.js";

class BookingsModule {}

decorateClass(BookingsModule, [
  Module({
    imports: [MoviesModule, ShowtimesModule, PromoCodesModule, ShowroomsModule],
    controllers: [BookingsController],
    providers: [BookingsService, DefaultPricingStrategy],
    exports: [BookingsService]
  })
]);

export { BookingsModule };
