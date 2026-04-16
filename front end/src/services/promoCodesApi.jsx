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

export function fetchAvailablePromoCodes(userId) {
  return APICallHandler({
    url: API_ENDPOINTS.promoCodes.available(userId),
    method: "GET",
    operation: "Fetch available promo codes"
  });
}
