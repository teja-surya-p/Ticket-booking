import { Body, Controller, Delete, Get, Headers, Param, ParseIntPipe, Post, Query } from "@nestjs/common";
import { decorateClass, decorateMethod, parameterDecorator } from "../common/nest-metadata.js";
import { BookingsService } from "../services/bookings.service.js";

class BookingsController {
  constructor(bookingsService) {
    this.bookingsService = bookingsService;
  }

  async getSavedCard(authorization, customerEmail, customerUid) {
    return await this.bookingsService.getSavedCard(
      { customerEmail, customerUid },
      authorization
    );
  }

  async saveCard(authorization, body) {
    return await this.bookingsService.saveCard(body, authorization);
  }

  async deleteCard(authorization, cardId) {
    return await this.bookingsService.deleteCard(cardId, authorization);
  }

  async getReservedSeats(movieId, showtime) {
    return await this.bookingsService.getReservedSeats({ movieId, showtime });
  }

  async getPricing() {
    return this.bookingsService.getPricing();
  }

  async getQuote(body) {
    return await this.bookingsService.getQuote(body);
  }

  async createBooking(authorization, body) {
    return await this.bookingsService.createBooking(body, authorization);
  }
}

decorateMethod(
  BookingsController.prototype,
  "getSavedCard",
  [
    Get("card"),
    parameterDecorator(0, Headers("authorization")),
    parameterDecorator(1, Query("customerEmail")),
    parameterDecorator(2, Query("customerUid"))
  ],
  {
    paramTypes: [String, String, String],
    returnType: Promise
  }
);

decorateMethod(
  BookingsController.prototype,
  "saveCard",
  [
    Post("card"),
    parameterDecorator(0, Headers("authorization")),
    parameterDecorator(1, Body())
  ],
  {
    paramTypes: [String, Object],
    returnType: Promise
  }
);

decorateMethod(
  BookingsController.prototype,
  "deleteCard",
  [
    Delete("card/:cardId"),
    parameterDecorator(0, Headers("authorization")),
    parameterDecorator(1, Param("cardId"))
  ],
  {
    paramTypes: [String, String],
    returnType: Promise
  }
);

decorateMethod(
  BookingsController.prototype,
  "getReservedSeats",
  [
    Get("seats"),
    parameterDecorator(0, Query("movieId", ParseIntPipe)),
    parameterDecorator(1, Query("showtime"))
  ],
  {
    paramTypes: [Number, String],
    returnType: Promise
  }
);

decorateMethod(BookingsController.prototype, "getPricing", [Get("pricing")], {
  paramTypes: [],
  returnType: Promise
});

decorateMethod(
  BookingsController.prototype,
  "getQuote",
  [Post("quote"), parameterDecorator(0, Body())],
  {
    paramTypes: [Object],
    returnType: Promise
  }
);

decorateMethod(
  BookingsController.prototype,
  "createBooking",
  [Post(), parameterDecorator(0, Headers("authorization")), parameterDecorator(1, Body())],
  {
    paramTypes: [String, Object],
    returnType: Promise
  }
);

decorateClass(BookingsController, [Controller("bookings")], [BookingsService]);

export { BookingsController };
