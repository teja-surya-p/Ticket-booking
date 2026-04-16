import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query
} from "@nestjs/common";
import { decorateClass, decorateMethod, parameterDecorator } from "../common/nest-metadata.js";
import { AuthGuardService } from "../services/auth-guard.service.js";
import { MovieNotificationsService } from "../services/movie-notifications.service.js";
import { MoviesService } from "../services/movies.service.js";
import { ShowtimesService } from "../services/showtimes.service.js";

class MoviesController {
  constructor(moviesService, showtimesService, authGuardService, movieNotificationsService) {
    this.moviesService = moviesService;
    this.showtimesService = showtimesService;
    this.authGuardService = authGuardService;
    this.movieNotificationsService = movieNotificationsService;
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

  async getShowtimesForMovie(movieId) {
    await this.moviesService.findById(movieId);
    return await this.showtimesService.findByMovieId(movieId);
  }

  async createMovie(authorization, body) {
    await this.authGuardService.requireAuthenticatedCustomer(authorization);
    return await this.moviesService.create(body);
  }

  async updateMovie(authorization, id, body) {
    await this.authGuardService.requireAuthenticatedCustomer(authorization);
    return await this.moviesService.update(id, body);
  }

  async deleteMovie(authorization, id) {
    await this.authGuardService.requireAuthenticatedCustomer(authorization);
    await this.moviesService.remove(id);
  }

  async subscribeToMovieNotification(movieId, body) {
    const { userId, email, displayName } = body ?? {};
    return await this.movieNotificationsService.subscribe({ movieId, userId, email, displayName });
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
  { paramTypes: [Number], returnType: Promise }
);

decorateMethod(
  MoviesController.prototype,
  "getShowtimesForMovie",
  [Get(":movieId/showtimes"), parameterDecorator(0, Param("movieId", ParseIntPipe))],
  { paramTypes: [Number], returnType: Promise }
);

decorateMethod(
  MoviesController.prototype,
  "createMovie",
  [Post(), parameterDecorator(0, Headers("authorization")), parameterDecorator(1, Body())],
  { paramTypes: [String, Object], returnType: Promise }
);

decorateMethod(
  MoviesController.prototype,
  "updateMovie",
  [
    Patch(":id"),
    parameterDecorator(0, Headers("authorization")),
    parameterDecorator(1, Param("id", ParseIntPipe)),
    parameterDecorator(2, Body())
  ],
  { paramTypes: [String, Number, Object], returnType: Promise }
);

decorateMethod(
  MoviesController.prototype,
  "deleteMovie",
  [
    Delete(":id"),
    HttpCode(HttpStatus.NO_CONTENT),
    parameterDecorator(0, Headers("authorization")),
    parameterDecorator(1, Param("id", ParseIntPipe))
  ],
  { paramTypes: [String, Number], returnType: Promise }
);

decorateMethod(
  MoviesController.prototype,
  "subscribeToMovieNotification",
  [
    Post(":movieId/notify"),
    HttpCode(HttpStatus.OK),
    parameterDecorator(0, Param("movieId", ParseIntPipe)),
    parameterDecorator(1, Body())
  ],
  { paramTypes: [Number, Object], returnType: Promise }
);

decorateClass(MoviesController, [Controller("movies")], [MoviesService, ShowtimesService, AuthGuardService, MovieNotificationsService]);

export { MoviesController };
