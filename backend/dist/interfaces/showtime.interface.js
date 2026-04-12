/**
 * IShowtimesRepository
 *
 * DIP: ShowtimesService depends on this abstraction.
 *
 * @typedef {Object} Showtime
 * @property {string} showtimeId
 * @property {number} movieId
 * @property {string} showroomId
 * @property {string} startAt   - ISO 8601 timestamp, canonical format
 * @property {string} createdAt
 *
 * IShowtimesRepository contract:
 *   findByMovieId(movieId: number): Promise<Showtime[]>
 *   findByShowroomAndStartAt(showroomId: string, startAt: string): Promise<Showtime | null>
 *   save(showtime: Showtime): Promise<void>
 *
 * IShowtimeConflictChecker contract:
 *   hasConflict(showroomId: string, startAt: string): Promise<boolean>
 */
export {};
