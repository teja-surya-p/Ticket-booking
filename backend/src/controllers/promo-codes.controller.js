import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { decorateClass, decorateMethod, parameterDecorator } from "../common/nest-metadata.js";
import { PromoCodesService } from "../services/promo-codes.service.js";

class PromoCodesController {
  constructor(promoCodesService) {
    this.promoCodesService = promoCodesService;
  }

  async validatePromoCode(body) {
    const { code, userId } = body ?? {};
    return await this.promoCodesService.validate(code, userId);
  }
}

decorateMethod(
  PromoCodesController.prototype,
  "validatePromoCode",
  [Post("validate"), HttpCode(HttpStatus.OK), parameterDecorator(0, Body())],
  { paramTypes: [Object], returnType: Promise }
);

decorateClass(PromoCodesController, [Controller("promo-codes")], [PromoCodesService]);

export { PromoCodesController };
