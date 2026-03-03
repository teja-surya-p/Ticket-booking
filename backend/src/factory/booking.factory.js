"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInitialReservedSeatMap = createInitialReservedSeatMap;
const constants_1 = require("../common/constants");
const utils_1 = require("../common/utils");
function createInitialReservedSeatMap(movies) {
    const reservedSeatMap = new Map();
    movies.forEach((movie) => {
        movie.showtimes.forEach((showtime) => {
            const key = (0, utils_1.buildSeatMapKey)(movie.id, showtime);
            reservedSeatMap.set(key, new Set(constants_1.DEFAULT_RESERVED_SEATS));
        });
    });
    return reservedSeatMap;
}
