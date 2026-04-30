import { Module } from "@nestjs/common";
import { decorateClass } from "../common/nest-metadata.js";
import { SeatLocksService } from "../services/seat-locks.service.js";

class SeatLocksModule {}

decorateClass(SeatLocksModule, [
  Module({
    providers: [SeatLocksService],
    exports: [SeatLocksService]
  })
]);

export { SeatLocksModule };
