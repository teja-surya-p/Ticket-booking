import { Body, Controller, Delete, Get, Headers, Param, Post } from "@nestjs/common";
import { decorateClass, decorateMethod, parameterDecorator } from "../common/nest-metadata.js";
import { FavoritesService } from "../services/favorites.service.js";

class FavoritesController {
  constructor(favoritesService) {
    this.favoritesService = favoritesService;
  }

  async getFavorites(authorization) {
    return await this.favoritesService.getFavorites(authorization);
  }

  async addFavorite(authorization, body) {
    return await this.favoritesService.addFavorite(authorization, body);
  }

  async removeFavorite(authorization, movieId) {
    return await this.favoritesService.removeFavorite(authorization, movieId);
  }
}

decorateMethod(
  FavoritesController.prototype,
  "getFavorites",
  [Get(), parameterDecorator(0, Headers("authorization"))],
  {
    paramTypes: [String],
    returnType: Promise
  }
);

decorateMethod(
  FavoritesController.prototype,
  "addFavorite",
  [
    Post(),
    parameterDecorator(0, Headers("authorization")),
    parameterDecorator(1, Body())
  ],
  {
    paramTypes: [String, Object],
    returnType: Promise
  }
);

decorateMethod(
  FavoritesController.prototype,
  "removeFavorite",
  [
    Delete(":movieId"),
    parameterDecorator(0, Headers("authorization")),
    parameterDecorator(1, Param("movieId"))
  ],
  {
    paramTypes: [String, String],
    returnType: Promise
  }
);

decorateClass(FavoritesController, [Controller("favorites")], [FavoritesService]);

export { FavoritesController };
