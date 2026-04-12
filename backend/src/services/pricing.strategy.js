/**
 * DefaultPricingStrategy
 *
 * OCP: BookingsService is open for extension — swap this strategy for a
 * PromotionPricingStrategy, TaxPricingStrategy, etc. without modifying
 * BookingsService. Satisfies the IPricingStrategy contract defined in
 * interfaces/pricing.interface.js.
 */
import { Injectable } from "@nestjs/common";
import { BOOKING_SERVICE_FEE_RATE, TICKET_PRICING } from "../common/constants.js";
import { roundCurrency } from "../common/utils.js";
import { decorateClass } from "../common/nest-metadata.js";

class DefaultPricingStrategy {
  /**
   * Returns the pricing table (satisfies IPricingStrategy.getPricing).
   * @returns {{ adult: number, child: number, senior: number }}
   */
  getPricing() {
    return {
      adult: TICKET_PRICING.adult,
      child: TICKET_PRICING.child,
      senior: TICKET_PRICING.senior
    };
  }

  /**
   * Builds a full quote from ticket counts (satisfies IPricingStrategy.buildQuote).
   * @param {{ adult: number, child: number, senior: number }} tickets
   * @returns {{ subtotal: number, serviceFee: number, total: number, currency: string }}
   */
  buildQuote(tickets) {
    const adult = Number(tickets?.adult ?? 0);
    const child = Number(tickets?.child ?? 0);
    const senior = Number(tickets?.senior ?? 0);

    const subtotal = roundCurrency(
      adult * TICKET_PRICING.adult +
        child * TICKET_PRICING.child +
        senior * TICKET_PRICING.senior
    );
    const serviceFee = roundCurrency(subtotal * BOOKING_SERVICE_FEE_RATE);
    const total = roundCurrency(subtotal + serviceFee);

    return { subtotal, serviceFee, total, currency: "USD" };
  }
}

decorateClass(DefaultPricingStrategy, [Injectable()]);

export { DefaultPricingStrategy };
