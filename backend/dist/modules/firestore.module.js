import { Global, Module } from "@nestjs/common";
import { decorateClass } from "../common/nest-metadata.js";
import { FirestoreService } from "../config/firestore.service.js";

class FirestoreModule {}

decorateClass(FirestoreModule, [
  Global(),
  Module({
    providers: [FirestoreService],
    exports: [FirestoreService]
  })
]);

export { FirestoreModule };
