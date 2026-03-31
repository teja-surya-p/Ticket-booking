import { Module } from "@nestjs/common";
import { decorateClass } from "../common/nest-metadata.js";
import { AuthController } from "../controllers/auth.controller.js";
import { AuthService } from "../services/auth.service.js";
import { ProfileNotificationService } from "../services/profile-notification.service.js";

class AuthModule {}

decorateClass(AuthModule, [
  Module({
    controllers: [AuthController],
    providers: [AuthService, ProfileNotificationService]
  })
]);

export { AuthModule };
