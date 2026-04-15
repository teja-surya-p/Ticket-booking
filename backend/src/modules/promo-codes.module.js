import { Module } from "@nestjs/common";
import { decorateClass } from "../common/nest-metadata.js";
import { PromoCodesController } from "../controllers/promo-codes.controller.js";
import { PromoCodesService } from "../services/promo-codes.service.js";

class PromoCodesModule {}

decorateClass(PromoCodesModule, [
  Module({
    controllers: [PromoCodesController],
    providers: [PromoCodesService],
    exports: [PromoCodesService]
  })
]);

export { PromoCodesModule };
