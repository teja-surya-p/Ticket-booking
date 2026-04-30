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
import { BookingsService } from "../services/bookings.service.js";

class BookingsController {
  constructor(bookingsService) {
    this.bookingsService = bookingsService;
  }

  // ── Card management ──────────────────────────────────────────────────────

  async getSavedCard(authorization, customerEmail, customerUid) {
    return await this.bookingsService.getSavedCard(
      { customerEmail, customerUid },
      authorization
    );
  }

  async saveCard(authorization, body) {
    return await this.bookingsService.saveCard(body, authorization);
  }

  async updateCard(authorization, cardId, body) {
    return await this.bookingsService.updateCard(cardId, body, authorization);
  }

  async deleteCard(authorization, cardId) {
    return await this.bookingsService.deleteCard(cardId, authorization);
  }

  // ── Seat availability & pricing ──────────────────────────────────────────

  async getReservedSeats(movieId, showtime) {
    return await this.bookingsService.getReservedSeats({ movieId, showtime });
  }

  // ── Seat locking ─────────────────────────────────────────────────────────

  async lockSeat(authorization, body) {
    return await this.bookingsService.lockSeat(body, authorization);
  }

  async unlockSeat(authorization, body) {
    return await this.bookingsService.unlockSeat(body, authorization);
  }

  async getPricing() {
    return this.bookingsService.getPricing();
  }

  async getQuote(body) {
    return await this.bookingsService.getQuote(body);
  }

  // ── Draft booking flow ───────────────────────────────────────────────────

  async createDraftBooking(body) {
    return await this.bookingsService.createDraftBooking(body);
  }

  async saveBookingSeats(bookingId, body) {
    return await this.bookingsService.saveBookingSeats(bookingId, body);
  }

  async getBookingSummary(authorization, bookingId) {
    return await this.bookingsService.getBookingSummary(bookingId, authorization);
  }

  // ── Confirmed booking ────────────────────────────────────────────────────

  async createBooking(authorization, body) {
    return await this.bookingsService.createBooking(body, authorization);
  }

  // ── User booking history ──────────────────────────────────────────────────

  async getMyBookings(authorization) {
    return await this.bookingsService.getMyBookings(authorization);
  }

  // ── Cancel booking ────────────────────────────────────────────────────────

  async cancelBooking(authorization, bookingId) {
    return await this.bookingsService.cancelBooking(bookingId, authorization);
  }

  // ── Email OTP verification ────────────────────────────────────────────────

  async sendEmailOtp(body) {
    return await this.bookingsService.sendEmailOtp(body?.email);
  }

  async verifyEmailOtp(body) {
    return await this.bookingsService.verifyEmailOtp(body?.email, body?.code);
  }
}

// ── Card routes ────────────────────────────────────────────────────────────

decorateMethod(
  BookingsController.prototype,
  "getSavedCard",
  [
    Get("card"),
    parameterDecorator(0, Headers("authorization")),
    parameterDecorator(1, Query("customerEmail")),
    parameterDecorator(2, Query("customerUid"))
  ],
  { paramTypes: [String, String, String], returnType: Promise }
);

decorateMethod(
  BookingsController.prototype,
  "saveCard",
  [
    Post("card"),
    parameterDecorator(0, Headers("authorization")),
    parameterDecorator(1, Body())
  ],
  { paramTypes: [String, Object], returnType: Promise }
);

decorateMethod(
  BookingsController.prototype,
  "updateCard",
  [
    Patch("card/:cardId"),
    parameterDecorator(0, Headers("authorization")),
    parameterDecorator(1, Param("cardId")),
    parameterDecorator(2, Body())
  ],
  { paramTypes: [String, String, Object], returnType: Promise }
);

decorateMethod(
  BookingsController.prototype,
  "deleteCard",
  [
    Delete("card/:cardId"),
    parameterDecorator(0, Headers("authorization")),
    parameterDecorator(1, Param("cardId"))
  ],
  { paramTypes: [String, String], returnType: Promise }
);

// ── Seat availability & pricing routes ────────────────────────────────────

decorateMethod(
  BookingsController.prototype,
  "getReservedSeats",
  [
    Get("seats"),
    parameterDecorator(0, Query("movieId", ParseIntPipe)),
    parameterDecorator(1, Query("showtime"))
  ],
  { paramTypes: [Number, String], returnType: Promise }
);

decorateMethod(BookingsController.prototype, "getPricing", [Get("pricing")], {
  paramTypes: [],
  returnType: Promise
});

decorateMethod(
  BookingsController.prototype,
  "getQuote",
  [Post("quote"), parameterDecorator(0, Body())],
  { paramTypes: [Object], returnType: Promise }
);

// ── Draft booking routes ───────────────────────────────────────────────────

decorateMethod(
  BookingsController.prototype,
  "createDraftBooking",
  [Post("draft"), HttpCode(HttpStatus.CREATED), parameterDecorator(0, Body())],
  { paramTypes: [Object], returnType: Promise }
);

// ── Seat locking routes (must appear before ":bookingId/seats") ───────────

decorateMethod(
  BookingsController.prototype,
  "lockSeat",
  [
    Post("seats/lock"),
    HttpCode(HttpStatus.OK),
    parameterDecorator(0, Headers("authorization")),
    parameterDecorator(1, Body())
  ],
  { paramTypes: [String, Object], returnType: Promise }
);

decorateMethod(
  BookingsController.prototype,
  "unlockSeat",
  [
    Post("seats/unlock"),
    HttpCode(HttpStatus.OK),
    parameterDecorator(0, Headers("authorization")),
    parameterDecorator(1, Body())
  ],
  { paramTypes: [String, Object], returnType: Promise }
);

decorateMethod(
  BookingsController.prototype,
  "saveBookingSeats",
  [
    Post(":bookingId/seats"),
    HttpCode(HttpStatus.OK),
    parameterDecorator(0, Param("bookingId")),
    parameterDecorator(1, Body())
  ],
  { paramTypes: [String, Object], returnType: Promise }
);

decorateMethod(
  BookingsController.prototype,
  "getBookingSummary",
  [
    Get(":bookingId/summary"),
    parameterDecorator(0, Headers("authorization")),
    parameterDecorator(1, Param("bookingId"))
  ],
  { paramTypes: [String, String], returnType: Promise }
);

// ── Confirmed booking route ────────────────────────────────────────────────

decorateMethod(
  BookingsController.prototype,
  "createBooking",
  [Post(), parameterDecorator(0, Headers("authorization")), parameterDecorator(1, Body())],
  { paramTypes: [String, Object], returnType: Promise }
);

// ── User booking history route ────────────────────────────────────────────

decorateMethod(
  BookingsController.prototype,
  "getMyBookings",
  [Get("mine"), parameterDecorator(0, Headers("authorization"))],
  { paramTypes: [String], returnType: Promise }
);

decorateMethod(
  BookingsController.prototype,
  "cancelBooking",
  [
    Patch(":bookingId/cancel"),
    HttpCode(HttpStatus.OK),
    parameterDecorator(0, Headers("authorization")),
    parameterDecorator(1, Param("bookingId"))
  ],
  { paramTypes: [String, String], returnType: Promise }
);

decorateMethod(
  BookingsController.prototype,
  "sendEmailOtp",
  [Post("verify-email/send-otp"), HttpCode(HttpStatus.OK), parameterDecorator(0, Body())],
  { paramTypes: [Object], returnType: Promise }
);

decorateMethod(
  BookingsController.prototype,
  "verifyEmailOtp",
  [Post("verify-email/verify-otp"), HttpCode(HttpStatus.OK), parameterDecorator(0, Body())],
  { paramTypes: [Object], returnType: Promise }
);

decorateClass(BookingsController, [Controller("bookings")], [BookingsService]);

export { BookingsController };
