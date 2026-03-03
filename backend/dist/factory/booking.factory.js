import { DEFAULT_RESERVED_SEATS } from "../common/constants.js";
import { buildSeatMapKey } from "../common/utils.js";

function createInitialReservedSeatMap(movies) {
  const reservedSeatMap = new Map();

  movies.forEach((movie) => {
    movie.showtimes.forEach((showtime) => {
      const key = buildSeatMapKey(movie.id, showtime);
      reservedSeatMap.set(key, new Set(DEFAULT_RESERVED_SEATS));
    });
  });

  return reservedSeatMap;
}

export { createInitialReservedSeatMap };
