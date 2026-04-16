import { Module } from "@nestjs/common";
import { decorateClass } from "../common/nest-metadata.js";
import { ShowroomsController } from "../controllers/showrooms.controller.js";
import { AdminAccessService } from "../services/admin-access.service.js";
import { ShowroomsService } from "../services/showrooms.service.js";
import { MoviesModule } from "./movies.module.js";
import { ShowtimesModule } from "./showtimes.module.js";

class ShowroomsModule {}

decorateClass(ShowroomsModule, [
  Module({
    imports: [MoviesModule, ShowtimesModule],
    controllers: [ShowroomsController],
    providers: [ShowroomsService, AdminAccessService],
    exports: [ShowroomsService]
  })
]);

export { ShowroomsModule };
