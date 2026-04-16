import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post
} from "@nestjs/common";
import { decorateClass, decorateMethod, parameterDecorator } from "../common/nest-metadata.js";
import { AdminAccessService } from "../services/admin-access.service.js";
import { ShowroomsService } from "../services/showrooms.service.js";

class ShowroomsController {
  constructor(showroomsService, adminAccessService) {
    this.showroomsService = showroomsService;
    this.adminAccessService = adminAccessService;
  }

  async getShowrooms() {
    return await this.showroomsService.findAll();
  }

  async getShowroomById(showroomId) {
    return await this.showroomsService.findById(showroomId);
  }

  async createShowroom(adminEmail, adminPassword, body) {
    this.adminAccessService.requireAdminAccess(adminEmail, adminPassword);
    return await this.showroomsService.create(body);
  }

  async updateShowroom(adminEmail, adminPassword, showroomId, body) {
    this.adminAccessService.requireAdminAccess(adminEmail, adminPassword);
    return await this.showroomsService.update(showroomId, body);
  }

  async deleteShowroom(adminEmail, adminPassword, showroomId) {
    this.adminAccessService.requireAdminAccess(adminEmail, adminPassword);
    await this.showroomsService.delete(showroomId);
  }
}

decorateMethod(ShowroomsController.prototype, "getShowrooms", [Get()], {
  paramTypes: [],
  returnType: Promise
});

decorateMethod(
  ShowroomsController.prototype,
  "getShowroomById",
  [Get(":showroomId"), parameterDecorator(0, Param("showroomId"))],
  { paramTypes: [String], returnType: Promise }
);

decorateMethod(
  ShowroomsController.prototype,
  "createShowroom",
  [
    Post(),
    HttpCode(HttpStatus.CREATED),
    parameterDecorator(0, Headers("x-admin-email")),
    parameterDecorator(1, Headers("x-admin-password")),
    parameterDecorator(2, Body())
  ],
  { paramTypes: [String, String, Object], returnType: Promise }
);

decorateMethod(
  ShowroomsController.prototype,
  "updateShowroom",
  [
    Patch(":showroomId"),
    parameterDecorator(0, Headers("x-admin-email")),
    parameterDecorator(1, Headers("x-admin-password")),
    parameterDecorator(2, Param("showroomId")),
    parameterDecorator(3, Body())
  ],
  { paramTypes: [String, String, String, Object], returnType: Promise }
);

decorateMethod(
  ShowroomsController.prototype,
  "deleteShowroom",
  [
    Delete(":showroomId"),
    HttpCode(HttpStatus.NO_CONTENT),
    parameterDecorator(0, Headers("x-admin-email")),
    parameterDecorator(1, Headers("x-admin-password")),
    parameterDecorator(2, Param("showroomId"))
  ],
  { paramTypes: [String, String, String], returnType: Promise }
);

decorateClass(ShowroomsController, [Controller("showrooms")], [ShowroomsService, AdminAccessService]);

export { ShowroomsController };
