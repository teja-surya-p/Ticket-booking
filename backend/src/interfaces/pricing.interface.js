/**
 * IPricingStrategy
 *
 * OCP: BookingsService is open for extension (new pricing rules, promotions, taxes)
 * without modifying its core booking logic. Inject any strategy that satisfies this contract.
 *
 * @typedef {Object} TicketCounts
 * @property {number} adult
 * @property {number} child
 * @property {number} senior
 *
 * @typedef {Object} PricingTable
 * @property {number} adult
 * @property {number} child
 * @property {number} senior
 *
 * @typedef {Object} BookingQuote
 * @property {number} subtotal
 * @property {number} serviceFee
 * @property {number} total
 * @property {string} currency
 *
 * IPricingStrategy contract:
 *   getPricing(): PricingTable
 *   buildQuote(tickets: TicketCounts): BookingQuote
 */
export {};
