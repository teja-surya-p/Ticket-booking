import { Global, Module } from "@nestjs/common";
import { decorateClass } from "../common/nest-metadata.js";
import { AuthGuardService } from "../services/auth-guard.service.js";

/**
 * AuthGuardModule — @Global so AuthGuardService is available in every module
 * without explicit imports. Follows DIP: any service that needs auth
 * verification injects AuthGuardService rather than calling firebase-admin.
 */
class AuthGuardModule {}

decorateClass(AuthGuardModule, [
  Global(),
  Module({
    providers: [AuthGuardService],
    exports: [AuthGuardService]
  })
]);

export { AuthGuardModule };
