/**
 * IShowroomsRepository
 *
 * DIP: ShowroomsService depends on this abstraction, not on the Firestore SDK directly.
 * Any persistence adapter (Firestore, in-memory, SQL) must satisfy this contract.
 *
 * @typedef {Object} ShowroomLayout
 * @property {number} rows
 * @property {number} cols
 * @property {number} totalSeats
 *
 * @typedef {Object} Showroom
 * @property {string} showroomId
 * @property {string} name
 * @property {ShowroomLayout} layout
 * @property {string} createdAt
 * @property {string} updatedAt
 *
 * IShowroomsRepository contract:
 *   findAll(): Promise<Showroom[]>
 *   findById(showroomId: string): Promise<Showroom | null>
 *   save(showroom: Showroom): Promise<void>
 *   count(): Promise<number>
 */
export {};
