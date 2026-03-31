import { Module } from "@nestjs/common";
import { decorateClass } from "./common/nest-metadata.js";
import { AdminModule } from "./modules/admin.module.js";
import { AuthModule } from "./modules/auth.module.js";
import { BookingsModule } from "./modules/bookings.module.js";
import { FavoritesModule } from "./modules/favorites.module.js";
import { FirestoreModule } from "./modules/firestore.module.js";
import { MoviesModule } from "./modules/movies.module.js";

class AppModule {}

decorateClass(AppModule, [
  Module({
    imports: [
      FirestoreModule,
      MoviesModule,
      BookingsModule,
      FavoritesModule,
      AdminModule,
      AuthModule
    ]
  })
]);

export { AppModule };
