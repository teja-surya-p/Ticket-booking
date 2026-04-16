import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, Query } from "@nestjs/common";
import { decorateClass, decorateMethod, parameterDecorator } from "../common/nest-metadata.js";
import { AuthGuardService } from "../services/auth-guard.service.js";
import { PromoCodesService } from "../services/promo-codes.service.js";
import { AdminService } from "../services/admin.service.js";

class AdminController {
  constructor(adminService, promoCodesService, authGuardService) {
    this.adminService = adminService;
    this.promoCodesService = promoCodesService;
    this.authGuardService = authGuardService;
  }

  async getStats() {
    return await this.adminService.getDashboardStats();
  }

  async scheduleShowtime(body) {
    return await this.adminService.scheduleShowtime(body);
  }

  async sendPromotion(body) {
    return await this.adminService.sendPromotion(body);
  }

  async getAvailableShowrooms(startAt) {
    return await this.adminService.getAvailableShowrooms(startAt);
  }

  async createPromoCode(authorization, body) {
    await this.authGuardService.requireAuthenticatedCustomer(authorization, {});
    return await this.promoCodesService.create(body);
  }

  async getAllShowtimes() {
    return await this.adminService.getAllShowtimes();
  }
}

decorateMethod(AdminController.prototype, "getStats", [Get("stats")], {
  paramTypes: [],
  returnType: Promise
});

decorateMethod(
  AdminController.prototype,
  "scheduleShowtime",
  [Post("showtimes"), HttpCode(HttpStatus.CREATED), parameterDecorator(0, Body())],
  { paramTypes: [Object], returnType: Promise }
);

decorateMethod(
  AdminController.prototype,
  "sendPromotion",
  [Post("promotions"), HttpCode(HttpStatus.CREATED), parameterDecorator(0, Body())],
  { paramTypes: [Object], returnType: Promise }
);

decorateMethod(
  AdminController.prototype,
  "getAvailableShowrooms",
  [Get("available-showrooms"), parameterDecorator(0, Query("startAt"))],
  { paramTypes: [String], returnType: Promise }
);

decorateMethod(
  AdminController.prototype,
  "createPromoCode",
  [
    Post("promo-codes"),
    HttpCode(HttpStatus.CREATED),
    parameterDecorator(0, Headers("authorization")),
    parameterDecorator(1, Body())
  ],
  { paramTypes: [String, Object], returnType: Promise }
);

decorateMethod(AdminController.prototype, "getAllShowtimes", [Get("showtimes")], {
  paramTypes: [],
  returnType: Promise
});

decorateClass(AdminController, [Controller("admin")], [AdminService, PromoCodesService, AuthGuardService]);

export { AdminController };
