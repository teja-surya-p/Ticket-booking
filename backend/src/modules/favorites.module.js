import { Module } from "@nestjs/common";
import { decorateClass } from "../common/nest-metadata.js";
import { FavoritesController } from "../controllers/favorites.controller.js";
import { FavoritesService } from "../services/favorites.service.js";
import { MoviesModule } from "./movies.module.js";

class FavoritesModule {}

decorateClass(FavoritesModule, [
  Module({
    imports: [MoviesModule],
    controllers: [FavoritesController],
    providers: [FavoritesService],
    exports: [FavoritesService]
  })
]);

export { FavoritesModule };
