import { Controller, Get } from "@nestjs/common";
import { decorateClass, decorateMethod } from "../common/nest-metadata.js";
import { ShowroomsService } from "../services/showrooms.service.js";

class ShowroomsController {
  constructor(showroomsService) {
    this.showroomsService = showroomsService;
  }

  async getShowrooms() {
    return await this.showroomsService.findAll();
  }
}

decorateMethod(ShowroomsController.prototype, "getShowrooms", [Get()], {
  paramTypes: [],
  returnType: Promise
});

decorateClass(ShowroomsController, [Controller("showrooms")], [ShowroomsService]);

export { ShowroomsController };
