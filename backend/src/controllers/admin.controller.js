import { Body, Controller, Delete, Get, Headers, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common";
import { decorateClass, decorateMethod, parameterDecorator } from "../common/nest-metadata.js";
import { AdminAccessService } from "../services/admin-access.service.js";
import { PromoCodesService } from "../services/promo-codes.service.js";
import { AdminService } from "../services/admin.service.js";

class AdminController {
  constructor(adminService, promoCodesService, adminAccessService) {
    this.adminService = adminService;
    this.promoCodesService = promoCodesService;
    this.adminAccessService = adminAccessService;
  }

  async getStats(adminEmail, adminPassword) {
    this.adminAccessService.requireAdminAccess(adminEmail, adminPassword);
    return await this.adminService.getDashboardStats();
  }

  async scheduleShowtime(adminEmail, adminPassword, body) {
    this.adminAccessService.requireAdminAccess(adminEmail, adminPassword);
    return await this.adminService.scheduleShowtime(body);
  }

  async sendPromotion(adminEmail, adminPassword, body) {
    this.adminAccessService.requireAdminAccess(adminEmail, adminPassword);
    return await this.adminService.sendPromotion(body);
  }

  async getAvailableShowrooms(adminEmail, adminPassword, startAt) {
    this.adminAccessService.requireAdminAccess(adminEmail, adminPassword);
    return await this.adminService.getAvailableShowrooms(startAt);
  }

  async createPromoCode(adminEmail, adminPassword, body) {
    this.adminAccessService.requireAdminAccess(adminEmail, adminPassword);
    return await this.promoCodesService.create(body);
  }

  async getAllShowtimes(adminEmail, adminPassword) {
    this.adminAccessService.requireAdminAccess(adminEmail, adminPassword);
    return await this.adminService.getAllShowtimes();
  }

  async cancelShowtime(adminEmail, adminPassword, showtimeId) {
    this.adminAccessService.requireAdminAccess(adminEmail, adminPassword);
    await this.adminService.cancelShowtime(showtimeId);
  }
}

decorateMethod(
  AdminController.prototype,
  "getStats",
  [
    Get("stats"),
    parameterDecorator(0, Headers("x-admin-email")),
    parameterDecorator(1, Headers("x-admin-password"))
  ],
  {
    paramTypes: [String, String],
    returnType: Promise
  }
);

decorateMethod(
  AdminController.prototype,
  "scheduleShowtime",
  [
    Post("showtimes"),
    HttpCode(HttpStatus.CREATED),
    parameterDecorator(0, Headers("x-admin-email")),
    parameterDecorator(1, Headers("x-admin-password")),
    parameterDecorator(2, Body())
  ],
  { paramTypes: [String, String, Object], returnType: Promise }
);

decorateMethod(
  AdminController.prototype,
  "sendPromotion",
  [
    Post("promotions"),
    HttpCode(HttpStatus.CREATED),
    parameterDecorator(0, Headers("x-admin-email")),
    parameterDecorator(1, Headers("x-admin-password")),
    parameterDecorator(2, Body())
  ],
  { paramTypes: [String, String, Object], returnType: Promise }
);

decorateMethod(
  AdminController.prototype,
  "getAvailableShowrooms",
  [
    Get("available-showrooms"),
    parameterDecorator(0, Headers("x-admin-email")),
    parameterDecorator(1, Headers("x-admin-password")),
    parameterDecorator(2, Query("startAt"))
  ],
  { paramTypes: [String, String, String], returnType: Promise }
);

decorateMethod(
  AdminController.prototype,
  "createPromoCode",
  [
    Post("promo-codes"),
    HttpCode(HttpStatus.CREATED),
    parameterDecorator(0, Headers("x-admin-email")),
    parameterDecorator(1, Headers("x-admin-password")),
    parameterDecorator(2, Body())
  ],
  { paramTypes: [String, String, Object], returnType: Promise }
);

decorateMethod(
  AdminController.prototype,
  "getAllShowtimes",
  [
    Get("showtimes"),
    parameterDecorator(0, Headers("x-admin-email")),
    parameterDecorator(1, Headers("x-admin-password"))
  ],
  {
    paramTypes: [String, String],
    returnType: Promise
  }
);

decorateMethod(
  AdminController.prototype,
  "cancelShowtime",
  [
    Delete("showtimes/:id"),
    HttpCode(HttpStatus.NO_CONTENT),
    parameterDecorator(0, Headers("x-admin-email")),
    parameterDecorator(1, Headers("x-admin-password")),
    parameterDecorator(2, Param("id"))
  ],
  { paramTypes: [String, String, String], returnType: Promise }
);

decorateClass(AdminController, [Controller("admin")], [AdminService, PromoCodesService, AdminAccessService]);

export { AdminController };
