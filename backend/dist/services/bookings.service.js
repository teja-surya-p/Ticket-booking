import {
  BadRequestException,
  ConflictException,
  Injectable
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  FIRESTORE_COLLECTIONS,
  MAX_TICKETS_PER_BOOKING,
  TICKET_PRICING,
  BOOKING_SERVICE_FEE_RATE
} from "../common/constants.js";
import { decorateClass } from "../common/nest-metadata.js";
import { buildSeatMapKey, roundCurrency } from "../common/utils.js";
import { FirestoreService } from "../config/firestore.service.js";
import { toBookingEntity } from "../entities/booking.entity.js";
import { createInitialReservedSeatMap } from "../factory/booking.factory.js";
import { createSeedMovies } from "../factory/movie.factory.js";
import { MoviesService } from "./movies.service.js";

class BookingsService {
  constructor(firestoreService, moviesService) {
    this.firestoreService = firestoreService;
    this.moviesService = moviesService;
    this.inMemoryBookings = new Map();
    this.inMemoryReservedSeats = createInitialReservedSeatMap(createSeedMovies());
  }

  async getReservedSeats(query) {
    const movie = await this.moviesService.findById(query.movieId);

    if (!query.showtime || !movie.showtimes.includes(query.showtime)) {
      throw new BadRequestException("Invalid showtime for the selected movie");
    }

    if (!this.firestoreService.isEnabled()) {
      const key = buildSeatMapKey(query.movieId, query.showtime);
      const reservedSeats = new Set(this.inMemoryReservedSeats.get(key) ?? []);

      for (const booking of this.inMemoryBookings.values()) {
        if (booking.movieId === query.movieId && booking.showtime === query.showtime) {
          booking.seatIds.forEach((seatId) => reservedSeats.add(seatId));
        }
      }

      return {
        movieId: query.movieId,
        showtime: query.showtime,
        reservedSeats: Array.from(reservedSeats).sort()
      };
    }

    const bookings = await this.findBookingsByShowtime(query.movieId, query.showtime);
    const reservedSeats = Array.from(
      new Set(bookings.flatMap((booking) => booking.seatIds))
    ).sort();

    return {
      movieId: query.movieId,
      showtime: query.showtime,
      reservedSeats
    };
  }

  getPricing() {
    return {
      adult: TICKET_PRICING.adult,
      child: TICKET_PRICING.child,
      senior: TICKET_PRICING.senior
    };
  }

  async getQuote(payload) {
    const tickets = await this.validateAndNormalizePayload(payload);
    const subtotal = roundCurrency(
      tickets.adult * TICKET_PRICING.adult +
        tickets.child * TICKET_PRICING.child +
        tickets.senior * TICKET_PRICING.senior
    );
    const serviceFee = roundCurrency(subtotal * BOOKING_SERVICE_FEE_RATE);
    const total = roundCurrency(subtotal + serviceFee);

    return {
      subtotal,
      serviceFee,
      total,
      currency: "USD"
    };
  }

  async createBooking(payload) {
    await this.validateAndNormalizePayload(payload);
    const uniqueSeatIds = Array.from(new Set(payload.seatIds));
    const existingReservedSeats = new Set(
      (
        await this.getReservedSeats({
          movieId: payload.movieId,
          showtime: payload.showtime
        })
      ).reservedSeats
    );
    const conflicts = uniqueSeatIds.filter((seatId) => existingReservedSeats.has(seatId));

    if (conflicts.length > 0) {
      throw new ConflictException(`Some seats are already reserved: ${conflicts.join(", ")}`);
    }

    const quote = await this.getQuote(payload);
    const booking = toBookingEntity({
      bookingId: randomUUID(),
      movieId: payload.movieId,
      showtime: payload.showtime,
      seatIds: uniqueSeatIds,
      tickets: payload.tickets,
      customerName: payload.customerName,
      customerEmail: payload.customerEmail,
      status: "confirmed",
      total: quote.total,
      createdAt: new Date().toISOString()
    });

    if (!this.firestoreService.isEnabled()) {
      this.inMemoryBookings.set(booking.bookingId, booking);
      return {
        bookingId: booking.bookingId,
        status: booking.status,
        total: booking.total
      };
    }

    await this.collection().doc(booking.bookingId).set(booking);
    return {
      bookingId: booking.bookingId,
      status: booking.status,
      total: booking.total
    };
  }

  async getRevenue() {
    if (!this.firestoreService.isEnabled()) {
      return roundCurrency(
        Array.from(this.inMemoryBookings.values()).reduce(
          (sum, booking) => sum + booking.total,
          0
        )
      );
    }

    const snapshot = await this.collection().get();

    return roundCurrency(
      snapshot.docs.reduce((sum, doc) => {
        const total = Number(doc.data().total);
        return sum + (Number.isFinite(total) ? total : 0);
      }, 0)
    );
  }

  collection() {
    return this.firestoreService.db().collection(FIRESTORE_COLLECTIONS.bookings);
  }

  async findBookingsByShowtime(movieId, showtime) {
    if (!this.firestoreService.isEnabled()) {
      return Array.from(this.inMemoryBookings.values())
        .filter((booking) => booking.movieId === movieId && booking.showtime === showtime)
        .map((booking) => ({ seatIds: [...booking.seatIds] }));
    }

    const [numberIdSnapshot, stringIdSnapshot] = await Promise.all([
      this.collection().where("movieId", "==", movieId).where("showtime", "==", showtime).get(),
      this.collection().where("movieId", "==", String(movieId)).where("showtime", "==", showtime).get()
    ]);
    const docs = [...numberIdSnapshot.docs, ...stringIdSnapshot.docs];

    return docs
      .map((doc) => doc.data())
      .map((data) => ({
        seatIds: Array.isArray(data.seatIds)
          ? data.seatIds.filter((value) => typeof value === "string")
          : Array.isArray(data.seats)
            ? data.seats.filter((value) => typeof value === "string")
            : []
      }));
  }

  async validateAndNormalizePayload(payload) {
    const movie = await this.moviesService.findById(payload.movieId);

    if (!payload.showtime || payload.showtime.trim().length === 0) {
      throw new BadRequestException("showtime is required");
    }

    if (!movie.showtimes.includes(payload.showtime)) {
      throw new BadRequestException("Invalid showtime for the selected movie");
    }

    if (!Array.isArray(payload.seatIds) || payload.seatIds.length === 0) {
      throw new BadRequestException("At least one seat must be selected");
    }

    const adult = Number(payload.tickets?.adult ?? 0);
    const child = Number(payload.tickets?.child ?? 0);
    const senior = Number(payload.tickets?.senior ?? 0);

    if ([adult, child, senior].some((value) => value < 0 || !Number.isFinite(value))) {
      throw new BadRequestException("Invalid ticket counts");
    }

    const totalTickets = adult + child + senior;
    if (totalTickets <= 0) {
      throw new BadRequestException("At least one ticket is required");
    }

    if (totalTickets > MAX_TICKETS_PER_BOOKING) {
      throw new BadRequestException(
        `A booking cannot exceed ${MAX_TICKETS_PER_BOOKING} tickets`
      );
    }

    const uniqueSeatIds = Array.from(new Set(payload.seatIds));
    if (uniqueSeatIds.length !== payload.seatIds.length) {
      throw new BadRequestException("Each selected seat must be unique");
    }

    if (payload.seatIds.length !== totalTickets) {
      throw new BadRequestException("Seat count must match total ticket count");
    }

    return { adult, child, senior };
  }
}

decorateClass(BookingsService, [Injectable()], [FirestoreService, MoviesService]);

export { BookingsService };
