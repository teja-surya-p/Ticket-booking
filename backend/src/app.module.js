import { Module } from "@nestjs/common";
import { decorateClass } from "./common/nest-metadata.js";
import { AdminModule } from "./modules/admin.module.js";
import { BookingsModule } from "./modules/bookings.module.js";
import { FirestoreModule } from "./modules/firestore.module.js";
import { MoviesModule } from "./modules/movies.module.js";

class AppModule {}

decorateClass(AppModule, [
  Module({
    imports: [FirestoreModule, MoviesModule, BookingsModule, AdminModule]
  })
]);

export { AppModule };
