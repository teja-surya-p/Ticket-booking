import { Module } from "@nestjs/common";
import { decorateClass } from "../common/nest-metadata.js";
import { ShowroomsController } from "../controllers/showrooms.controller.js";
import { ShowroomsService } from "../services/showrooms.service.js";

class ShowroomsModule {}

decorateClass(ShowroomsModule, [
  Module({
    controllers: [ShowroomsController],
    providers: [ShowroomsService],
    exports: [ShowroomsService]
  })
]);

export { ShowroomsModule };
