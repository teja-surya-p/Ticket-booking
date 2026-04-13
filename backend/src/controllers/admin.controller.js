import { Body, Controller, Get, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { decorateClass, decorateMethod, parameterDecorator } from "../common/nest-metadata.js";
import { AdminService } from "../services/admin.service.js";

class AdminController {
  constructor(adminService) {
    this.adminService = adminService;
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

decorateClass(AdminController, [Controller("admin")], [AdminService]);

export { AdminController };
