import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from "@nestjs/common";
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

  async getAvailablePromoCodes(userId) {
    return await this.promoCodesService.findAvailable(userId ?? "");
  }
}

decorateMethod(
  PromoCodesController.prototype,
  "validatePromoCode",
  [Post("validate"), HttpCode(HttpStatus.OK), parameterDecorator(0, Body())],
  { paramTypes: [Object], returnType: Promise }
);

decorateMethod(
  PromoCodesController.prototype,
  "getAvailablePromoCodes",
  [Get("available"), HttpCode(HttpStatus.OK), parameterDecorator(0, Query("userId"))],
  { paramTypes: [String], returnType: Promise }
);

decorateClass(PromoCodesController, [Controller("promo-codes")], [PromoCodesService]);

export { PromoCodesController };
