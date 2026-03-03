import { Controller, Get } from "@nestjs/common";
import { decorateClass, decorateMethod } from "../common/nest-metadata.js";
import { AdminService } from "../services/admin.service.js";

class AdminController {
  constructor(adminService) {
    this.adminService = adminService;
  }

  async getStats() {
    return await this.adminService.getDashboardStats();
  }
}

decorateMethod(AdminController.prototype, "getStats", [Get("stats")], {
  paramTypes: [],
  returnType: Promise
});

decorateClass(AdminController, [Controller("admin")], [AdminService]);

export { AdminController };
