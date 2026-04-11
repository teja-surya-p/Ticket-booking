import { Module } from "@nestjs/common";
import { decorateClass } from "../common/nest-metadata.js";
import { ShowsController } from "../controllers/shows.controller.js";
import { ShowsService } from "../services/shows.service.js";
import { MoviesModule } from "./movies.module.js";

class ShowsModule {}

decorateClass(ShowsModule, [
  Module({
    imports: [MoviesModule],
    controllers: [ShowsController],
    providers: [ShowsService],
    exports: [ShowsService]
  })
]);

export { ShowsModule };
