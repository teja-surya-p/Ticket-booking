"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_TICKETS_PER_BOOKING = exports.MOVIE_STATUSES = exports.DEFAULT_RESERVED_SEATS = exports.BOOKING_SERVICE_FEE_RATE = exports.DEFAULT_TRAILER_URL = exports.DEFAULT_MOVIE_POSTER = exports.TICKET_PRICING = exports.FIRESTORE_COLLECTIONS = exports.API_PREFIX = void 0;
exports.API_PREFIX = 'api/v1';
exports.FIRESTORE_COLLECTIONS = {
    movies: 'movies',
    bookings: 'booking',
};
exports.TICKET_PRICING = {
    adult: 12.99,
    child: 8.99,
    senior: 9.99,
};
exports.DEFAULT_MOVIE_POSTER = '/placeholder.jpg';
exports.DEFAULT_TRAILER_URL = '';
exports.BOOKING_SERVICE_FEE_RATE = 0.05;
exports.MAX_TICKETS_PER_BOOKING = 6;
exports.DEFAULT_RESERVED_SEATS = [
    '1-3',
    '1-4',
    '2-5',
    '3-7',
    '4-2',
    '5-8',
    '6-1',
    '7-9',
];
exports.MOVIE_STATUSES = ['currently_running', 'coming_soon'];
