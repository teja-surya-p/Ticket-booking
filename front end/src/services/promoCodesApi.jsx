import { APICallHandler } from "./apiCallHandler";
import { API_ENDPOINTS } from "./constants";

export function validatePromoCode(payload) {
  return APICallHandler({
    url: API_ENDPOINTS.promoCodes.validate,
    method: "POST",
    operation: "Validate promo code",
    body: payload
  });
}
