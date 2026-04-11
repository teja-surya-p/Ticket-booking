import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { decorateClass, decorateMethod, parameterDecorator } from "../common/nest-metadata.js";
import { ShowsService } from "../services/shows.service.js";

class ShowsController {
  constructor(showsService) {
    this.showsService = showsService;
  }

  async listShows(query) {
    return await this.showsService.listByMovie(query.movieId);
  }

  async createShow(body) {
    return await this.showsService.createShow(body);
  }
}

decorateMethod(
  ShowsController.prototype,
  "listShows",
  [Get(), parameterDecorator(0, Query())],
  { paramTypes: [Object], returnType: Promise }
);

decorateMethod(
  ShowsController.prototype,
  "createShow",
  [Post(), parameterDecorator(0, Body())],
  { paramTypes: [Object], returnType: Promise }
);

decorateClass(ShowsController, [Controller("shows")], [ShowsService]);

export { ShowsController };
