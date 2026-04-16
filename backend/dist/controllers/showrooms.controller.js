import { Controller, Get, Param } from "@nestjs/common";
import { decorateClass, decorateMethod, parameterDecorator } from "../common/nest-metadata.js";
import { ShowroomsService } from "../services/showrooms.service.js";

class ShowroomsController {
  constructor(showroomsService) {
    this.showroomsService = showroomsService;
  }

  async getShowrooms() {
    return await this.showroomsService.findAll();
  }

  async getShowroomById(showroomId) {
    return await this.showroomsService.findById(showroomId);
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

decorateClass(ShowroomsController, [Controller("showrooms")], [ShowroomsService]);

export { ShowroomsController };
