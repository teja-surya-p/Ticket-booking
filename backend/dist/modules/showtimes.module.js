import { Module } from "@nestjs/common";
import { decorateClass } from "../common/nest-metadata.js";
import { ShowtimesService } from "../services/showtimes.service.js";

class ShowtimesModule {}

decorateClass(ShowtimesModule, [
  Module({
    providers: [ShowtimesService],
    exports: [ShowtimesService]
  })
]);

export { ShowtimesModule };
