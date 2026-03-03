"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingsService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const constants_1 = require("../common/constants");
const utils_1 = require("../common/utils");
const booking_entity_1 = require("../entities/booking.entity");
const firestore_service_1 = require("../config/firestore.service");
const booking_factory_1 = require("../factory/booking.factory");
const movie_factory_1 = require("../factory/movie.factory");
const movies_service_1 = require("./movies.service");
let BookingsService = class BookingsService {
    constructor(firestoreService, moviesService) {
        this.firestoreService = firestoreService;
        this.moviesService = moviesService;
        this.inMemoryBookings = new Map();
        this.inMemoryReservedSeats = (0, booking_factory_1.createInitialReservedSeatMap)((0, movie_factory_1.createSeedMovies)());
    }
    async getReservedSeats(query) {
        const movie = await this.moviesService.findById(query.movieId);
        if (!query.showtime || !movie.showtimes.includes(query.showtime)) {
            throw new common_1.BadRequestException('Invalid showtime for the selected movie');
        }
        if (!this.firestoreService.isEnabled()) {
            const key = (0, utils_1.buildSeatMapKey)(query.movieId, query.showtime);
            const reservedSeats = new Set(this.inMemoryReservedSeats.get(key) ?? []);
            for (const booking of this.inMemoryBookings.values()) {
                if (booking.movieId === query.movieId && booking.showtime === query.showtime) {
                    booking.seatIds.forEach((seatId) => reservedSeats.add(seatId));
                }
            }
            return {
                movieId: query.movieId,
                showtime: query.showtime,
                reservedSeats: Array.from(reservedSeats).sort(),
            };
        }
        const bookings = await this.findBookingsByShowtime(query.movieId, query.showtime);
        const reservedSeats = Array.from(new Set(bookings.flatMap((booking) => booking.seatIds))).sort();
        return {
            movieId: query.movieId,
            showtime: query.showtime,
            reservedSeats,
        };
    }
    getPricing() {
        return {
            adult: constants_1.TICKET_PRICING.adult,
            child: constants_1.TICKET_PRICING.child,
            senior: constants_1.TICKET_PRICING.senior,
        };
    }
    async getQuote(payload) {
        const tickets = await this.validateAndNormalizePayload(payload);
        const subtotal = (0, utils_1.roundCurrency)(tickets.adult * constants_1.TICKET_PRICING.adult +
            tickets.child * constants_1.TICKET_PRICING.child +
            tickets.senior * constants_1.TICKET_PRICING.senior);
        const serviceFee = (0, utils_1.roundCurrency)(subtotal * constants_1.BOOKING_SERVICE_FEE_RATE);
        const total = (0, utils_1.roundCurrency)(subtotal + serviceFee);
        return {
            subtotal,
            serviceFee,
            total,
            currency: 'USD',
        };
    }
    async createBooking(payload) {
        await this.validateAndNormalizePayload(payload);
        const uniqueSeatIds = Array.from(new Set(payload.seatIds));
        const existingReservedSeats = new Set((await this.getReservedSeats({
            movieId: payload.movieId,
            showtime: payload.showtime,
        })).reservedSeats);
        const conflicts = uniqueSeatIds.filter((seatId) => existingReservedSeats.has(seatId));
        if (conflicts.length > 0) {
            throw new common_1.ConflictException(`Some seats are already reserved: ${conflicts.join(', ')}`);
        }
        const quote = await this.getQuote(payload);
        const booking = (0, booking_entity_1.toBookingEntity)({
            bookingId: (0, node_crypto_1.randomUUID)(),
            movieId: payload.movieId,
            showtime: payload.showtime,
            seatIds: uniqueSeatIds,
            tickets: payload.tickets,
            customerName: payload.customerName,
            customerEmail: payload.customerEmail,
            status: 'confirmed',
            total: quote.total,
            createdAt: new Date().toISOString(),
        });
        if (!this.firestoreService.isEnabled()) {
            this.inMemoryBookings.set(booking.bookingId, booking);
            return {
                bookingId: booking.bookingId,
                status: booking.status,
                total: booking.total,
            };
        }
        await this.collection().doc(booking.bookingId).set(booking);
        return {
            bookingId: booking.bookingId,
            status: booking.status,
            total: booking.total,
        };
    }
    async getRevenue() {
        if (!this.firestoreService.isEnabled()) {
            return (0, utils_1.roundCurrency)(Array.from(this.inMemoryBookings.values()).reduce((sum, booking) => sum + booking.total, 0));
        }
        const snapshot = await this.collection().get();
        return (0, utils_1.roundCurrency)(snapshot.docs.reduce((sum, doc) => {
            const total = Number(doc.data().total);
            return sum + (Number.isFinite(total) ? total : 0);
        }, 0));
    }
    collection() {
        return this.firestoreService.db().collection(constants_1.FIRESTORE_COLLECTIONS.bookings);
    }
    async findBookingsByShowtime(movieId, showtime) {
        if (!this.firestoreService.isEnabled()) {
            return Array.from(this.inMemoryBookings.values())
                .filter((booking) => booking.movieId === movieId && booking.showtime === showtime)
                .map((booking) => ({ seatIds: [...booking.seatIds] }));
        }
        const [numberIdSnapshot, stringIdSnapshot] = await Promise.all([
            this.collection().where('movieId', '==', movieId).where('showtime', '==', showtime).get(),
            this.collection()
                .where('movieId', '==', String(movieId))
                .where('showtime', '==', showtime)
                .get(),
        ]);
        const docs = [...numberIdSnapshot.docs, ...stringIdSnapshot.docs];
        return docs
            .map((doc) => doc.data())
            .map((data) => ({
            seatIds: Array.isArray(data.seatIds)
                ? data.seatIds.filter((value) => typeof value === 'string')
                : Array.isArray(data.seats)
                    ? data.seats.filter((value) => typeof value === 'string')
                    : [],
        }));
    }
    async validateAndNormalizePayload(payload) {
        const movie = await this.moviesService.findById(payload.movieId);
        if (!payload.showtime || payload.showtime.trim().length === 0) {
            throw new common_1.BadRequestException('showtime is required');
        }
        if (!movie.showtimes.includes(payload.showtime)) {
            throw new common_1.BadRequestException('Invalid showtime for the selected movie');
        }
        if (!Array.isArray(payload.seatIds) || payload.seatIds.length === 0) {
            throw new common_1.BadRequestException('At least one seat must be selected');
        }
        const adult = Number(payload.tickets?.adult ?? 0);
        const child = Number(payload.tickets?.child ?? 0);
        const senior = Number(payload.tickets?.senior ?? 0);
        if ([adult, child, senior].some((value) => value < 0 || !Number.isFinite(value))) {
            throw new common_1.BadRequestException('Invalid ticket counts');
        }
        const totalTickets = adult + child + senior;
        if (totalTickets <= 0) {
            throw new common_1.BadRequestException('At least one ticket is required');
        }
        if (totalTickets > constants_1.MAX_TICKETS_PER_BOOKING) {
            throw new common_1.BadRequestException(`A booking cannot exceed ${constants_1.MAX_TICKETS_PER_BOOKING} tickets`);
        }
        const uniqueSeatIds = Array.from(new Set(payload.seatIds));
        if (uniqueSeatIds.length !== payload.seatIds.length) {
            throw new common_1.BadRequestException('Each selected seat must be unique');
        }
        if (payload.seatIds.length !== totalTickets) {
            throw new common_1.BadRequestException('Seat count must match total ticket count');
        }
        return { adult, child, senior };
    }
};
exports.BookingsService = BookingsService;
exports.BookingsService = BookingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firestore_service_1.FirestoreService,
        movies_service_1.MoviesService])
], BookingsService);
