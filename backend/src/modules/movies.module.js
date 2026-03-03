import { Module } from "@nestjs/common";
import { decorateClass } from "../common/nest-metadata.js";
import { MoviesController } from "../controllers/movies.controller.js";
import { MoviesService } from "../services/movies.service.js";

class MoviesModule {}

decorateClass(MoviesModule, [
  Module({
    controllers: [MoviesController],
    providers: [MoviesService],
    exports: [MoviesService]
  })
]);

export { MoviesModule };
