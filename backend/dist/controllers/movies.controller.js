import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query
} from "@nestjs/common";
import { decorateClass, decorateMethod, parameterDecorator } from "../common/nest-metadata.js";
import { MoviesService } from "../services/movies.service.js";

class MoviesController {
  constructor(moviesService) {
    this.moviesService = moviesService;
  }

  async getMovies(query) {
    return await this.moviesService.findAll(query);
  }

  async getGenres() {
    return await this.moviesService.getGenres();
  }

  async getMovieById(id) {
    return await this.moviesService.findById(id);
  }

  async createMovie(body) {
    return await this.moviesService.create(body);
  }

  async updateMovie(id, body) {
    return await this.moviesService.update(id, body);
  }

  async deleteMovie(id) {
    await this.moviesService.remove(id);
  }
}

decorateMethod(MoviesController.prototype, "getMovies", [Get(), parameterDecorator(0, Query())], {
  paramTypes: [Object],
  returnType: Promise
});

decorateMethod(MoviesController.prototype, "getGenres", [Get("genres")], {
  paramTypes: [],
  returnType: Promise
});

decorateMethod(
  MoviesController.prototype,
  "getMovieById",
  [Get(":id"), parameterDecorator(0, Param("id", ParseIntPipe))],
  {
    paramTypes: [Number],
    returnType: Promise
  }
);

decorateMethod(
  MoviesController.prototype,
  "createMovie",
  [Post(), parameterDecorator(0, Body())],
  {
    paramTypes: [Object],
    returnType: Promise
  }
);

decorateMethod(
  MoviesController.prototype,
  "updateMovie",
  [
    Patch(":id"),
    parameterDecorator(0, Param("id", ParseIntPipe)),
    parameterDecorator(1, Body())
  ],
  {
    paramTypes: [Number, Object],
    returnType: Promise
  }
);

decorateMethod(
  MoviesController.prototype,
  "deleteMovie",
  [
    Delete(":id"),
    HttpCode(HttpStatus.NO_CONTENT),
    parameterDecorator(0, Param("id", ParseIntPipe))
  ],
  {
    paramTypes: [Number],
    returnType: Promise
  }
);

decorateClass(MoviesController, [Controller("movies")], [MoviesService]);

export { MoviesController };
