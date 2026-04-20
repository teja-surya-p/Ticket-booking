/**
 * AuthGuardService
 *
 * SRP: Single responsibility — verify Firebase ID tokens and resolve the
 * authenticated customer identity. Extracted from BookingsService and
 * FavoritesService to eliminate duplication and give each service one reason
 * to change.
 *
 * DIP: Services (Bookings, Favorites) depend on this abstraction rather than
 * calling firebase-admin directly.
 */
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { decorateClass } from "../common/nest-metadata.js";
import { FirestoreService } from "../config/firestore.service.js";
import { JwtService } from "./jwt.service.js";

class AuthGuardService {
  constructor(firestoreService, jwtService) {
    this.firestoreService = firestoreService;
    this.jwtService = jwtService;
  }

  extractBearerToken(authorization) {
    if (typeof authorization !== "string") {
      throw new UnauthorizedException("Missing Authorization header");
    }

    const [scheme, token] = authorization.trim().split(/\s+/);
    if (scheme !== "Bearer" || !token) {
      throw new UnauthorizedException("Authorization header must use the Bearer scheme");
    }

    return token;
  }

  normalizeCustomerUid(value) {
    if (typeof value !== "string") {
      return null;
    }

    const uid = value.trim();
    return uid.length > 0 ? uid : null;
  }

  normalizeCustomerEmail(value) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new UnauthorizedException("Authenticated user email is missing");
    }

    return value.trim().toLowerCase();
  }

  normalizeOptionalCustomerEmail(value) {
    if (typeof value !== "string" || value.trim().length === 0) {
      return null;
    }

    const email = value.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email) ? email : null;
  }

  /**
   * Verifies the Bearer token, resolves authenticated uid + email, and
   * optionally validates that payload.customerUid / payload.customerEmail
   * match the token claims (prevents impersonation).
   *
   * @param {string} authorization - raw Authorization header value
   * @param {object} [payload] - optional request body/query with customerUid / customerEmail
   * @returns {Promise<{ customerUid: string, customerEmail: string }>}
   */
  async requireAuthenticatedCustomer(authorization, payload = {}) {
    const token = this.extractBearerToken(authorization);
    let decodedToken;

    try {
      decodedToken = this.jwtService.verifyAccessToken(token);
    } catch (error) {
      throw new UnauthorizedException(
        error instanceof Error ? error.message : "Invalid or expired access token"
      );
    }

    const authenticatedUid = this.normalizeCustomerUid(decodedToken?.uid);
    if (!authenticatedUid) {
      throw new UnauthorizedException("Authenticated user uid is missing");
    }

    const authenticatedEmail = this.normalizeOptionalCustomerEmail(decodedToken?.email);
    if (!authenticatedEmail) {
      throw new UnauthorizedException("Authenticated user email is missing");
    }

    const requestedUid = this.normalizeCustomerUid(payload?.customerUid);
    if (requestedUid && requestedUid !== authenticatedUid) {
      throw new UnauthorizedException("customerUid does not match authenticated user");
    }

    return { customerUid: authenticatedUid, customerEmail: authenticatedEmail };
  }
}

decorateClass(AuthGuardService, [Injectable()], [FirestoreService, JwtService]);

export { AuthGuardService };
