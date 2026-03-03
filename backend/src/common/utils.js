"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSeatMapKey = buildSeatMapKey;
exports.roundCurrency = roundCurrency;
function buildSeatMapKey(movieId, showtime) {
    return `${movieId}::${showtime}`;
}
function roundCurrency(value) {
    return Number(value.toFixed(2));
}
