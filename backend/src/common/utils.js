function buildSeatMapKey(movieId, showtime) {
  return `${movieId}::${showtime}`;
}

function roundCurrency(value) {
  return Number(value.toFixed(2));
}

export { buildSeatMapKey, roundCurrency };
