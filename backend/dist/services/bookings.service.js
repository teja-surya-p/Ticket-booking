import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import {
  FIRESTORE_COLLECTIONS,
  MAX_TICKETS_PER_BOOKING
} from "../common/constants.js";
import { decorateClass } from "../common/nest-metadata.js";
import { roundCurrency } from "../common/utils.js";
import { FirestoreService } from "../config/firestore.service.js";
import { toBookingEntity } from "../entities/booking.entity.js";
import { AuthGuardService } from "./auth-guard.service.js";
import { DefaultPricingStrategy } from "./pricing.strategy.js";
import { MoviesService } from "./movies.service.js";
import { ProfileNotificationService } from "./profile-notification.service.js";
import { PromoCodesService } from "./promo-codes.service.js";
import { ShowroomsService } from "./showrooms.service.js";
import { ShowtimesService } from "./showtimes.service.js";
import { SeatLocksService } from "./seat-locks.service.js";

/**
 * BookingsService
 *
 * SRP: Handles booking business rules — seat reservation, draft flow, card
 *      management, and confirmed bookings. Auth is delegated to AuthGuardService;
 *      pricing is delegated to DefaultPricingStrategy.
 *
 * DIP: Depends on AuthGuardService and DefaultPricingStrategy abstractions,
 *      not on firebase-admin or pricing constants directly.
 *
 * OCP: Swap DefaultPricingStrategy for any IPricingStrategy implementation
 *      (promotions, taxes) without modifying this class.
 */
class BookingsService {
  constructor(firestoreService, moviesService, authGuardService, pricingStrategy, showtimesService, promoCodesService, showroomsService, profileNotificationService, seatLocksService) {
    this.firestoreService = firestoreService;
    this.moviesService = moviesService;
    this.authGuardService = authGuardService;
    this.pricingStrategy = pricingStrategy;
    this.showtimesService = showtimesService;
    this.promoCodesService = promoCodesService;
    this.showroomsService = showroomsService;
    this.profileNotificationService = profileNotificationService;
    this.seatLocksService = seatLocksService;
  }

  // ── Card management ──────────────────────────────────────────────────────

  async getSavedCard(query, authorization) {
    const { customerEmail, customerUid } = await this.authGuardService.requireAuthenticatedCustomer(
      authorization,
      query
    );
    const cards = await this.findCardsForCustomer(customerEmail, customerUid);

    return { customerUid, customerEmail, cards, maxCardsAllowed: 3 };
  }

  async saveCard(payload, authorization) {
    const { customerEmail, customerUid } = await this.authGuardService.requireAuthenticatedCustomer(
      authorization,
      payload
    );
    const normalizedCard = this.validateAndNormalizeCardPayload(payload);
    const existingCards = await this.findCardDocsForCustomer(customerEmail, customerUid);
    const now = new Date().toISOString();
    const customerFingerprintKey = customerUid ?? customerEmail;
    const cardFingerprint = this.buildCardFingerprint(customerFingerprintKey, normalizedCard.cardNumber);
    const existingMatchingCard = existingCards.find(
      (card) => card.data.cardFingerprint === cardFingerprint
    );

    if (!existingMatchingCard && existingCards.length >= 3) {
      throw new BadRequestException("You can save up to 3 cards only.");
    }

    const cardDocId = existingMatchingCard ? existingMatchingCard.id : randomUUID();
    const existingData = existingMatchingCard ? existingMatchingCard.data : null;

    const cardRecord = {
      cardId: cardDocId,
      customerUid,
      customerEmail,
      cardholderName: normalizedCard.cardholderName,
      brand: normalizedCard.brand,
      last4: normalizedCard.last4,
      expMonth: normalizedCard.expMonth,
      expYear: normalizedCard.expYear,
      cardToken:
        existingData?.cardFingerprint === cardFingerprint &&
        typeof existingData?.cardToken === "string"
          ? existingData.cardToken
          : randomUUID(),
      cardFingerprint,
      createdAt: typeof existingData?.createdAt === "string" ? existingData.createdAt : now,
      updatedAt: now
    };

    await this.cardCollection().doc(cardDocId).set(cardRecord);
    const cards = await this.findCardsForCustomer(customerEmail, customerUid);

    return { customerUid, customerEmail, cards, savedCardId: cardDocId, maxCardsAllowed: 3 };
  }

  async updateCard(cardId, payload, authorization) {
    const normalizedCardId = this.normalizePaymentCardId(cardId);
    const { customerEmail, customerUid } = await this.authGuardService.requireAuthenticatedCustomer(
      authorization,
      payload
    );
    const existingCards = await this.findCardDocsForCustomer(customerEmail, customerUid);
    const existingCard = existingCards.find(
      (card) =>
        card.id === normalizedCardId ||
        (typeof card.data?.cardId === "string" && card.data.cardId === normalizedCardId)
    );

    if (!existingCard) {
      throw new BadRequestException("Saved card not found.");
    }

    const normalizedCardUpdate = this.validateAndNormalizeCardUpdatePayload(payload);
    const now = new Date().toISOString();
    const existingData = existingCard.data ?? {};
    const updatedCardRecord = {
      ...existingData,
      cardId: normalizedCardId,
      customerUid,
      customerEmail,
      cardholderName: normalizedCardUpdate.cardholderName,
      expMonth: normalizedCardUpdate.expMonth,
      expYear: normalizedCardUpdate.expYear,
      updatedAt: now
    };

    await this.cardCollection().doc(normalizedCardId).set(updatedCardRecord, { merge: true });
    const cards = await this.findCardsForCustomer(customerEmail, customerUid);

    return { customerUid, customerEmail, cards, updatedCardId: normalizedCardId, maxCardsAllowed: 3 };
  }

  async deleteCard(cardId, authorization) {
    const normalizedCardId = this.normalizePaymentCardId(cardId);
    const { customerEmail, customerUid } = await this.authGuardService.requireAuthenticatedCustomer(
      authorization,
      {}
    );
    const cards = await this.findCardsForCustomer(customerEmail, customerUid);
    const targetCard = cards.find((card) => card.cardId === normalizedCardId);

    if (!targetCard) {
      throw new BadRequestException("Saved card not found.");
    }

    await this.cardCollection().doc(targetCard.cardId).delete();
    const updatedCards = await this.findCardsForCustomer(customerEmail, customerUid);

    return {
      customerUid,
      customerEmail,
      cards: updatedCards,
      deletedCardId: targetCard.cardId,
      maxCardsAllowed: 3
    };
  }

  // ── Seat availability ────────────────────────────────────────────────────

  async getReservedSeats(query) {
    await this.moviesService.findById(query.movieId);

    if (!query.showtime || String(query.showtime).trim().length === 0) {
      throw new BadRequestException("showtime is required");
    }

    const bookings = await this.findBookingsByShowtime(query.movieId, query.showtime);
    const reservedSeats = Array.from(
      new Set(bookings.flatMap((booking) => booking.seatIds))
    ).sort();

    // Fetch active seat locks in parallel with showroom resolution.
    let lockedSeats = {};
    const [showroomResult] = await Promise.all([
      (async () => {
        let showroomId = null;
        let showroomName = null;
        let rows = null;
        let cols = null;
        try {
          const { showroom } = await this.resolveShowroomForShowtime(query.movieId, query.showtime);
          if (showroom) {
            showroomId = showroom.showroomId ?? null;
            showroomName = showroom.name ?? null;
            rows = showroom.layout?.rows ?? null;
            cols = showroom.layout?.cols ?? null;
          }
        } catch {
          // Hall lookup is best-effort; reserved seats are still returned.
        }
        return { showroomId, showroomName, rows, cols };
      })(),
      (async () => {
        try {
          lockedSeats = await this.seatLocksService.getLocksForShowtime(query.movieId, query.showtime);
        } catch {
          // Lock lookup is best-effort; seat availability is still returned.
        }
      })()
    ]);

    const { showroomId, showroomName, rows, cols } = showroomResult;

    return {
      movieId: query.movieId,
      showtime: query.showtime,
      reservedSeats,
      lockedSeats,
      showroomId,
      showroomName,
      rows,
      cols
    };
  }

  // ── Pricing (delegated to PricingStrategy — OCP) ─────────────────────────

  getPricing() {
    return this.pricingStrategy.getPricing();
  }

  async getQuote(payload) {
    const tickets = await this.validateMovieShowtimeAndTickets(payload);
    return this.pricingStrategy.buildQuote(tickets);
  }

  // ── Draft booking flow ───────────────────────────────────────────────────

  /**
   * Creates or updates a draft booking for {movieId, showtime, tickets}.
   * No auth required — returns a bookingId the frontend stores in sessionStorage.
   */
  async createDraftBooking(payload) {
    const tickets = await this.validateMovieShowtimeAndTickets(payload);
    const bookingId = randomUUID();
    const now = new Date().toISOString();

    const draft = {
      bookingId,
      movieId: payload.movieId,
      showtime: payload.showtime,
      tickets,
      seatIds: [],
      status: "draft",
      createdAt: now,
      updatedAt: now
    };

    await this.collection().doc(bookingId).set(draft);
    return { bookingId, status: "draft" };
  }

  /**
   * Saves selected seat IDs for a draft booking.
   * Validates: seat count matches total tickets, no conflicts with booked seats.
   */
  async saveBookingSeats(bookingId, payload) {
    if (typeof bookingId !== "string" || bookingId.trim().length === 0) {
      throw new BadRequestException("bookingId is required");
    }

    const docRef = this.collection().doc(bookingId.trim());
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    const booking = snapshot.data();
    if (booking.status !== "draft") {
      throw new BadRequestException("Only draft bookings can have seats saved");
    }

    if (!Array.isArray(payload?.seatIds) || payload.seatIds.length === 0) {
      throw new BadRequestException("At least one seat must be selected");
    }

    const uniqueSeatIds = Array.from(new Set(payload.seatIds));
    if (uniqueSeatIds.length !== payload.seatIds.length) {
      throw new BadRequestException("Each selected seat must be unique");
    }

    const tickets = booking.tickets ?? {};
    const totalTickets =
      Number(tickets.adult ?? 0) + Number(tickets.child ?? 0) + Number(tickets.senior ?? 0);

    if (uniqueSeatIds.length !== totalTickets) {
      throw new BadRequestException("Seat count must match total ticket count");
    }

    await this.assertValidSeatIdsForShowtime(booking.movieId, booking.showtime, uniqueSeatIds);

    const existingReservedSeats = new Set(
      (
        await this.getReservedSeats({
          movieId: booking.movieId,
          showtime: booking.showtime
        })
      ).reservedSeats
    );

    const conflicts = uniqueSeatIds.filter((seatId) => existingReservedSeats.has(seatId));
    if (conflicts.length > 0) {
      throw new ConflictException(`Seats already reserved: ${conflicts.join(", ")}`);
    }

    await docRef.set(
      { seatIds: uniqueSeatIds, status: "seats_selected", updatedAt: new Date().toISOString() },
      { merge: true }
    );

    return { bookingId, status: "seats_selected", seatIds: uniqueSeatIds };
  }

  /**
   * Returns the full order summary for a booking (AUTH required).
   * Enriches the draft with movie details and a pricing quote.
   */
  async getBookingSummary(bookingId, authorization) {
    await this.authGuardService.requireAuthenticatedCustomer(authorization, {});

    if (typeof bookingId !== "string" || bookingId.trim().length === 0) {
      throw new BadRequestException("bookingId is required");
    }

    const snapshot = await this.collection().doc(bookingId.trim()).get();
    if (!snapshot.exists) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    const booking = snapshot.data();
    const movie = await this.moviesService.findById(Number(booking.movieId));
    const quote = this.pricingStrategy.buildQuote(booking.tickets ?? {});

    return {
      bookingId: booking.bookingId,
      status: booking.status,
      movie: {
        id: movie.id,
        title: movie.title,
        poster: movie.poster
      },
      showtime: booking.showtime,
      seatIds: booking.seatIds ?? [],
      tickets: booking.tickets ?? {},
      pricing: {
        perTicket: this.pricingStrategy.getPricing(),
        subtotal: quote.subtotal,
        serviceFee: quote.serviceFee,
        total: quote.total,
        currency: quote.currency
      }
    };
  }

  // ── Email OTP verification ────────────────────────────────────────────────

  otpCollection() {
    return this.firestoreService.db().collection(FIRESTORE_COLLECTIONS.emailVerificationCodes);
  }

  async sendEmailOtp(email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== "string" || !emailPattern.test(email.trim().toLowerCase())) {
      throw new BadRequestException("Invalid email address.");
    }
    const normalizedEmail = email.trim().toLowerCase();
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

    // Overwrite any existing code for this email
    await this.otpCollection().doc(normalizedEmail).set({
      email: normalizedEmail,
      code,
      createdAt: now.toISOString(),
      expiresAt,
      attempts: 0
    });

    await this.profileNotificationService.sendOtpEmail(normalizedEmail, code);
    return { sent: true };
  }

  async verifyEmailOtp(email, code) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== "string" || !emailPattern.test(email.trim().toLowerCase())) {
      throw new BadRequestException("Invalid email address.");
    }
    if (typeof code !== "string" || code.trim().length === 0) {
      throw new BadRequestException("Verification code is required.");
    }
    const normalizedEmail = email.trim().toLowerCase();
    const docRef = this.otpCollection().doc(normalizedEmail);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new BadRequestException("No verification code found. Please request a new one.");
    }

    const data = doc.data();

    if (new Date(data.expiresAt) < new Date()) {
      await docRef.delete();
      throw new BadRequestException("Verification code has expired. Please request a new one.");
    }

    const attempts = (data.attempts ?? 0) + 1;
    if (attempts > 5) {
      await docRef.delete();
      throw new BadRequestException("Too many failed attempts. Please request a new code.");
    }

    if (data.code !== code.trim()) {
      await docRef.update({ attempts });
      throw new BadRequestException("Invalid verification code.");
    }

    // Correct — delete so code can't be reused
    await docRef.delete();
    return { verified: true };
  }

  // ── Confirmed booking ────────────────────────────────────────────────────

  async createBooking(payload, authorization) {
    const { customerEmail, customerUid } = await this.authGuardService.requireAuthenticatedCustomer(
      authorization,
      payload
    );
    const customerName = this.normalizeCustomerName(payload?.customerName);
    const paymentCardId = this.normalizePaymentCardId(payload?.paymentCardId);
    await this.validateAndNormalizePayload(payload);
    const savedCard = await this.requireSavedCard(customerEmail, paymentCardId, customerUid);
    const uniqueSeatIds = Array.from(new Set(payload.seatIds));

    // Verify that the caller still holds valid locks on all requested seats.
    // Accepts either the authenticated UID or a guestSessionId (for guests who
    // locked seats before logging in).
    const guestSessionId = typeof payload.guestSessionId === "string" ? payload.guestSessionId.trim() : null;
    await this.seatLocksService.verifyLockOwnership(
      uniqueSeatIds,
      payload.movieId,
      payload.showtime,
      customerUid,
      guestSessionId
    );

    const existingReservedSeats = new Set(
      (
        await this.getReservedSeats({
          movieId: payload.movieId,
          showtime: payload.showtime
        })
      ).reservedSeats
    );
    const conflicts = uniqueSeatIds.filter((seatId) => existingReservedSeats.has(seatId));

    if (conflicts.length > 0) {
      throw new ConflictException(`Some seats are already reserved: ${conflicts.join(", ")}`);
    }

    const quote = this.pricingStrategy.buildQuote(payload.tickets);

    // Apply promo code discount if provided
    let finalTotal = quote.total;
    let appliedPromoCodeId = null;
    let appliedDiscountPercent = 0;

    const promoCodeStr = typeof payload.promoCode === "string" ? payload.promoCode.trim() : "";
    if (promoCodeStr) {
      const promoResult = await this.promoCodesService.validate(promoCodeStr, customerUid);
      appliedPromoCodeId = promoResult.codeId;
      appliedDiscountPercent = promoResult.discountPercent;
      finalTotal = roundCurrency(quote.total * (1 - appliedDiscountPercent / 100));
    }

    const booking = toBookingEntity({
      bookingId: randomUUID(),
      movieId: payload.movieId,
      showtime: payload.showtime,
      seatIds: uniqueSeatIds,
      tickets: payload.tickets,
      customerUid,
      customerName: customerName ?? savedCard.cardholderName,
      customerEmail,
      paymentCard: {
        cardId: savedCard.cardId,
        cardToken: savedCard.cardToken,
        brand: savedCard.brand,
        last4: savedCard.last4,
        expMonth: savedCard.expMonth,
        expYear: savedCard.expYear
      },
      status: "confirmed",
      total: finalTotal,
      ...(appliedPromoCodeId ? { promoCode: promoCodeStr, discountPercent: appliedDiscountPercent } : {}),
      createdAt: new Date().toISOString()
    });

    await this.collection().doc(booking.bookingId).set(booking);

    if (appliedPromoCodeId) {
      await this.promoCodesService.markUsed(appliedPromoCodeId, customerUid);
    }

    // Resolve notification email: use the user-supplied address if it's a valid format,
    // otherwise fall back to the authenticated email.
    const _emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const _rawPayloadEmail = typeof payload?.customerEmail === "string" ? payload.customerEmail.trim().toLowerCase() : "";
    const notificationEmail = _emailPattern.test(_rawPayloadEmail) ? _rawPayloadEmail : customerEmail;

    // Fire-and-forget: send booking confirmation email
    this._sendBookingConfirmationEmail(booking, savedCard, notificationEmail).catch((err) => {
      console.error("[BookingsService] Booking confirmation email failed:", err?.message ?? err);
    });

    // Fire-and-forget: release all seat locks held by this user/session for this showtime
    const lockOwner = guestSessionId || customerUid;
    if (lockOwner) {
      this.seatLocksService.releaseLocksForUser(lockOwner, payload.movieId, payload.showtime).catch((err) => {
        console.error("[BookingsService] Lock release after booking failed:", err?.message ?? err);
      });
    }

    return { bookingId: booking.bookingId, status: booking.status, total: booking.total };
  }

  // ── Seat locking (delegates to SeatLocksService) ─────────────────────────

  /**
   * Acquires a 5-minute seat lock. If an auth token is present the backend
   * overrides `lockedBy` with the verified UID to prevent spoofing.
   */
  async lockSeat(payload, authorization) {
    let lockedBy = typeof payload?.lockedBy === "string" ? payload.lockedBy.trim() : "";
    const isGuest = payload?.isGuest === true;

    // If the caller is authenticated, trust the verified UID over the payload value
    if (authorization && typeof authorization === "string" && authorization.startsWith("Bearer ")) {
      try {
        const { customerUid } = await this.authGuardService.requireAuthenticatedCustomer(authorization, {});
        if (customerUid) lockedBy = customerUid;
      } catch {
        // Not authenticated — use payload lockedBy (guest)
      }
    }

    if (!lockedBy) {
      throw new BadRequestException("lockedBy is required");
    }

    const movieId = Number(payload?.movieId);
    const showtime = typeof payload?.showtime === "string" ? payload.showtime.trim() : "";
    const seatId = typeof payload?.seatId === "string" ? payload.seatId.trim() : "";

    if (!Number.isFinite(movieId) || movieId <= 0) throw new BadRequestException("movieId must be a positive number");
    if (!showtime) throw new BadRequestException("showtime is required");
    if (!seatId) throw new BadRequestException("seatId is required");

    return this.seatLocksService.acquireLock(movieId, showtime, seatId, lockedBy, !authorization ? true : isGuest);
  }

  /**
   * Releases a seat lock if the caller is the current owner.
   */
  async unlockSeat(payload, authorization) {
    let lockedBy = typeof payload?.lockedBy === "string" ? payload.lockedBy.trim() : "";

    if (authorization && typeof authorization === "string" && authorization.startsWith("Bearer ")) {
      try {
        const { customerUid } = await this.authGuardService.requireAuthenticatedCustomer(authorization, {});
        if (customerUid) lockedBy = customerUid;
      } catch {
        // Not authenticated — use payload lockedBy (guest)
      }
    }

    if (!lockedBy) {
      throw new BadRequestException("lockedBy is required");
    }

    const movieId = Number(payload?.movieId);
    const showtime = typeof payload?.showtime === "string" ? payload.showtime.trim() : "";
    const seatId = typeof payload?.seatId === "string" ? payload.seatId.trim() : "";

    if (!Number.isFinite(movieId) || movieId <= 0) throw new BadRequestException("movieId must be a positive number");
    if (!showtime) throw new BadRequestException("showtime is required");
    if (!seatId) throw new BadRequestException("seatId is required");

    return this.seatLocksService.releaseLock(movieId, showtime, seatId, lockedBy);
  }

  async getMyBookings(authorization) {
    const { customerEmail, customerUid } = await this.authGuardService.requireAuthenticatedCustomer(
      authorization,
      {}
    );

    const bookings = await this.findByCustomer(customerEmail, customerUid);

    // Enrich with movie title and poster (batch, best-effort)
    const uniqueMovieIds = [...new Set(bookings.map((b) => Number(b.movieId)).filter(Number.isFinite))];
    const movieCache = {};
    await Promise.all(
      uniqueMovieIds.map(async (id) => {
        try {
          const movie = await this.moviesService.findById(id);
          movieCache[id] = { title: movie.title, poster: movie.poster };
        } catch {
          movieCache[id] = { title: "Unknown Movie", poster: null };
        }
      })
    );

    return bookings.map((b) => {
      const movie = movieCache[Number(b.movieId)] ?? { title: "Unknown Movie", poster: null };
      return {
        bookingId: b.bookingId,
        movieId: b.movieId,
        movieTitle: movie.title,
        moviePoster: movie.poster,
        showtime: b.showtime,
        seatIds: b.seatIds ?? [],
        tickets: b.tickets ?? {},
        total: b.total,
        status: b.status,
        paymentCard: b.paymentCard
          ? { brand: b.paymentCard.brand, last4: b.paymentCard.last4 }
          : null,
        promoCode: b.promoCode ?? null,
        discountPercent: b.discountPercent ?? null,
        createdAt: b.createdAt,
        cancelledAt: b.cancelledAt ?? null,
        refundPercent: b.refundPercent ?? null,
        refundAmount: b.refundAmount ?? null
      };
    });
  }

  async cancelBooking(bookingId, authorization) {
    const { customerEmail, customerUid } = await this.authGuardService.requireAuthenticatedCustomer(
      authorization,
      {}
    );

    const docRef = this.collection().doc(bookingId);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException("Booking not found");
    const booking = doc.data();

    // Ownership check
    const normalizedUid = this.authGuardService.normalizeCustomerUid(customerUid);
    const normalizedEmail = typeof customerEmail === "string" ? customerEmail.trim().toLowerCase() : "";
    const ownsBooking =
      (normalizedUid && booking.customerUid === normalizedUid) ||
      (normalizedEmail && booking.customerEmail === normalizedEmail);
    if (!ownsBooking) throw new ForbiddenException("Not your booking");

    // Already cancelled — idempotent
    if (booking.status === "cancelled") {
      return {
        bookingId,
        status: "cancelled",
        refundAmount: booking.refundAmount ?? 0,
        refundPercent: booking.refundPercent ?? 0
      };
    }
    if (booking.status !== "confirmed") {
      throw new BadRequestException("Only confirmed bookings can be cancelled");
    }

    // Refund policy
    const hoursUntilShow = (new Date(booking.showtime) - Date.now()) / 3_600_000;
    const refundPercent = hoursUntilShow >= 24 ? 100 : hoursUntilShow >= 12 ? 40 : 0;
    const refundAmount = Math.round(booking.total * refundPercent) / 100;

    await docRef.update({
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
      refundPercent,
      refundAmount
    });

    return { bookingId, status: "cancelled", refundAmount, refundPercent };
  }

  async findByCustomer(customerEmail, customerUid) {
    const normalizedEmail =
      typeof customerEmail === "string" ? customerEmail.trim().toLowerCase() : "";
    const normalizedUid = this.authGuardService.normalizeCustomerUid(customerUid);

    const queries = [];
    if (normalizedUid) {
      queries.push(this.collection().where("customerUid", "==", normalizedUid).get());
    }
    if (normalizedEmail) {
      queries.push(this.collection().where("customerEmail", "==", normalizedEmail).get());
    }

    if (queries.length === 0) return [];

    const snapshots = await Promise.all(queries);
    const seen = new Set();
    const docs = [];
    for (const snapshot of snapshots) {
      for (const doc of snapshot.docs) {
        if (!seen.has(doc.id)) {
          seen.add(doc.id);
          docs.push(doc.data());
        }
      }
    }

    return docs
      .filter((b) => b.status === "confirmed" || b.status === "cancelled")
      .sort((a, b) => {
        const aTime = typeof a.showtime === "string" ? a.showtime : "";
        const bTime = typeof b.showtime === "string" ? b.showtime : "";
        return aTime.localeCompare(bTime); // ascending by showtime
      });
  }

  async getRevenue() {
    const snapshot = await this.collection().get();
    return roundCurrency(
      snapshot.docs.reduce((sum, doc) => {
        const total = Number(doc.data().total);
        return sum + (Number.isFinite(total) ? total : 0);
      }, 0)
    );
  }

  // ── Firestore helpers ────────────────────────────────────────────────────

  collection() {
    return this.firestoreService.db().collection(FIRESTORE_COLLECTIONS.bookings);
  }

  cardCollection() {
    return this.firestoreService.db().collection(FIRESTORE_COLLECTIONS.paymentCards);
  }

  async findCardDocsForCustomer(customerEmail, customerUid) {
    const normalizedUid = this.authGuardService.normalizeCustomerUid(customerUid);
    const [uidSnapshot, emailSnapshot] = await Promise.all([
      normalizedUid
        ? this.cardCollection().where("customerUid", "==", normalizedUid).get()
        : Promise.resolve(null),
      this.cardCollection().where("customerEmail", "==", customerEmail).get()
    ]);

    const docsById = new Map();
    const attachDoc = (doc) => { docsById.set(doc.id, { id: doc.id, data: doc.data() }); };

    if (uidSnapshot) { uidSnapshot.docs.forEach(attachDoc); }
    emailSnapshot.docs.forEach(attachDoc);

    if (normalizedUid) {
      const legacyEmailOnlyDocs = emailSnapshot.docs.filter((doc) => {
        const existingUid = this.authGuardService.normalizeCustomerUid(doc.data()?.customerUid);
        return !existingUid;
      });

      if (legacyEmailOnlyDocs.length > 0) {
        await Promise.all(
          legacyEmailOnlyDocs.map((doc) =>
            this.cardCollection().doc(doc.id).set({ customerUid: normalizedUid }, { merge: true })
          )
        );

        legacyEmailOnlyDocs.forEach((doc) => {
          const existing = docsById.get(doc.id);
          if (!existing) return;
          docsById.set(doc.id, { ...existing, data: { ...existing.data, customerUid: normalizedUid } });
        });
      }
    }

    return Array.from(docsById.values());
  }

  async findCardsForCustomer(customerEmail, customerUid) {
    const docs = await this.findCardDocsForCustomer(customerEmail, customerUid);
    return docs
      .map((item) => this.toSavedCardEntity(item.data, item.id))
      .sort((a, b) => {
        const aTime = Date.parse(a.updatedAt ?? a.createdAt ?? "");
        const bTime = Date.parse(b.updatedAt ?? b.createdAt ?? "");
        return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
      });
  }

  async requireSavedCard(customerEmail, paymentCardId, customerUid) {
    const cards = await this.findCardsForCustomer(customerEmail, customerUid);
    if (cards.length === 0) {
      throw new BadRequestException(
        "No saved card found for this email. Save a card before checkout."
      );
    }

    const selectedCard = cards.find((card) => card.cardId === paymentCardId);
    if (!selectedCard) {
      throw new BadRequestException("Select a valid saved card before checkout.");
    }

    return selectedCard;
  }

  toSavedCardEntity(data, fallbackCardId) {
    return {
      cardId:
        typeof data?.cardId === "string" && data.cardId.trim().length > 0
          ? data.cardId
          : fallbackCardId,
      customerUid:
        typeof data?.customerUid === "string" && data.customerUid.trim().length > 0
          ? data.customerUid.trim()
          : null,
      customerEmail: this.normalizeRequiredCustomerEmail(data?.customerEmail),
      cardholderName:
        typeof data?.cardholderName === "string" && data.cardholderName.trim().length > 0
          ? data.cardholderName.trim()
          : "Card Holder",
      brand:
        typeof data?.brand === "string" && data.brand.trim().length > 0 ? data.brand : "Unknown",
      last4:
        typeof data?.last4 === "string" && data.last4.trim().length === 4 ? data.last4 : "0000",
      expMonth: Number.isFinite(Number(data?.expMonth)) ? Number(data.expMonth) : 1,
      expYear: Number.isFinite(Number(data?.expYear)) ? Number(data.expYear) : 1970,
      cardToken:
        typeof data?.cardToken === "string" && data.cardToken.trim().length > 0
          ? data.cardToken
          : "",
      createdAt:
        typeof data?.createdAt === "string" && data.createdAt.trim().length > 0
          ? data.createdAt
          : undefined,
      updatedAt:
        typeof data?.updatedAt === "string" && data.updatedAt.trim().length > 0
          ? data.updatedAt
          : undefined
    };
  }

  normalizeRequiredCustomerEmail(value) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new BadRequestException("customerEmail is required");
    }

    const email = value.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      throw new BadRequestException("customerEmail must be a valid email address");
    }

    return email;
  }

  normalizeCustomerName(value) {
    if (typeof value !== "string") return null;
    const name = value.trim();
    return name.length > 0 ? name : null;
  }

  normalizePaymentCardId(value) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new BadRequestException("paymentCardId is required");
    }
    return value.trim();
  }

  buildCardFingerprint(customerKey, cardNumber) {
    return createHash("sha256").update(`${customerKey}:${cardNumber}`).digest("hex");
  }

  passesLuhn(cardNumber) {
    let sum = 0;
    let shouldDouble = false;

    for (let index = cardNumber.length - 1; index >= 0; index -= 1) {
      let digit = Number(cardNumber[index]);
      if (!Number.isFinite(digit)) return false;
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }

    return sum % 10 === 0;
  }

  detectCardBrand(cardNumber) {
    if (/^4\d{12}(\d{3})?(\d{3})?$/.test(cardNumber)) return "Visa";
    if (/^(5[1-5]\d{14}|2(2[2-9]\d{12}|[3-6]\d{13}|7([01]\d{12}|20\d{12})))$/.test(cardNumber))
      return "Mastercard";
    if (/^3[47]\d{13}$/.test(cardNumber)) return "American Express";
    if (/^6(?:011|5\d{2})\d{12}$/.test(cardNumber)) return "Discover";
    return "Card";
  }

  validateAndNormalizeCardPayload(payload) {
    const cardholderName =
      typeof payload?.cardholderName === "string" ? payload.cardholderName.trim() : "";
    if (cardholderName.length === 0) {
      throw new BadRequestException("cardholderName is required");
    }

    const cardNumberInput = typeof payload?.cardNumber === "string" ? payload.cardNumber : "";
    const cardNumber = cardNumberInput.replace(/\D/g, "");
    if (cardNumber.length < 12 || cardNumber.length > 19) {
      throw new BadRequestException("cardNumber must contain between 12 and 19 digits");
    }

    if (!this.passesLuhn(cardNumber)) {
      throw new BadRequestException("Invalid card number.");
    }

    const cvvInput = typeof payload?.cvv === "string" ? payload.cvv : "";
    const cvv = cvvInput.replace(/\D/g, "");
    if (cvv.length < 3 || cvv.length > 4) {
      throw new BadRequestException("cvv must contain 3 or 4 digits");
    }

    const rawMonth = Number(payload?.expMonth);
    const rawYear = Number(payload?.expYear);
    if (!Number.isInteger(rawMonth) || rawMonth < 1 || rawMonth > 12) {
      throw new BadRequestException("expMonth must be a number between 1 and 12");
    }
    if (!Number.isInteger(rawYear)) {
      throw new BadRequestException("expYear must be a valid year");
    }

    const expYear = rawYear < 100 ? 2000 + rawYear : rawYear;
    const now = new Date();
    if (expYear < now.getUTCFullYear() ||
        (expYear === now.getUTCFullYear() && rawMonth < now.getUTCMonth() + 1)) {
      throw new BadRequestException("Card expiry date is in the past");
    }

    return {
      cardholderName,
      cardNumber,
      last4: cardNumber.slice(-4),
      brand: this.detectCardBrand(cardNumber),
      expMonth: rawMonth,
      expYear
    };
  }

  validateAndNormalizeCardUpdatePayload(payload) {
    const cardholderName =
      typeof payload?.cardholderName === "string" ? payload.cardholderName.trim() : "";
    if (cardholderName.length === 0) {
      throw new BadRequestException("cardholderName is required");
    }

    const rawMonth = Number(payload?.expMonth);
    const rawYear = Number(payload?.expYear);
    if (!Number.isInteger(rawMonth) || rawMonth < 1 || rawMonth > 12) {
      throw new BadRequestException("expMonth must be a number between 1 and 12");
    }
    if (!Number.isInteger(rawYear)) {
      throw new BadRequestException("expYear must be a valid year");
    }

    const expYear = rawYear < 100 ? 2000 + rawYear : rawYear;
    const now = new Date();
    if (expYear < now.getUTCFullYear() ||
        (expYear === now.getUTCFullYear() && rawMonth < now.getUTCMonth() + 1)) {
      throw new BadRequestException("Card expiry date is in the past");
    }

    return { cardholderName, expMonth: rawMonth, expYear };
  }

  async findBookingsByShowtime(movieId, showtime) {
    const [numberIdSnapshot, stringIdSnapshot] = await Promise.all([
      this.collection().where("movieId", "==", movieId).where("showtime", "==", showtime).get(),
      this.collection()
        .where("movieId", "==", String(movieId))
        .where("showtime", "==", showtime)
        .get()
    ]);

    // Deduplicate docs by bookingId (number + string movieId queries may overlap)
    const seen = new Set();
    const docs = [...numberIdSnapshot.docs, ...stringIdSnapshot.docs].filter((doc) => {
      if (seen.has(doc.id)) return false;
      seen.add(doc.id);
      return true;
    });

    return docs
      .map((doc) => doc.data())
      // Only confirmed bookings permanently reserve seats.
      // draft / seats_selected are in-progress and must not block seats for other users.
      .filter((data) => data.status === "confirmed")
      .map((data) => ({
        seatIds: Array.isArray(data.seatIds)
          ? data.seatIds.filter((v) => typeof v === "string")
          : Array.isArray(data.seats)
            ? data.seats.filter((v) => typeof v === "string")
            : []
      }));
  }

  /**
   * Validates movieId, showtime, and ticket counts — used by draft bookings
   * and quote calculations where seats are not yet selected.
   */
  async validateMovieShowtimeAndTickets(payload) {
    const movie = await this.moviesService.findById(payload.movieId);

    if (!payload.showtime || payload.showtime.trim().length === 0) {
      throw new BadRequestException("showtime is required");
    }

    if (!movie.showtimes.includes(payload.showtime)) {
      // Fall back to checking the scheduled showtimes collection (ISO timestamps from Sprint 3)
      const scheduledShowtimes = await this.showtimesService.findByMovieId(payload.movieId);
      const isScheduled = scheduledShowtimes.some((st) => st.startAt === payload.showtime);
      if (!isScheduled) {
        throw new BadRequestException("Invalid showtime for the selected movie");
      }
    }

    const adult = Number(payload.tickets?.adult ?? 0);
    const child = Number(payload.tickets?.child ?? 0);
    const senior = Number(payload.tickets?.senior ?? 0);

    if ([adult, child, senior].some((v) => v < 0 || !Number.isFinite(v))) {
      throw new BadRequestException("Invalid ticket counts");
    }

    const totalTickets = adult + child + senior;
    if (totalTickets <= 0) {
      throw new BadRequestException("At least one ticket is required");
    }

    if (totalTickets > MAX_TICKETS_PER_BOOKING) {
      throw new BadRequestException(
        `A booking cannot exceed ${MAX_TICKETS_PER_BOOKING} tickets`
      );
    }

    return { adult, child, senior };
  }

  /**
   * Full payload validation including seats — used for confirmed bookings.
   */
  async validateAndNormalizePayload(payload) {
    const tickets = await this.validateMovieShowtimeAndTickets(payload);

    if (!Array.isArray(payload.seatIds) || payload.seatIds.length === 0) {
      throw new BadRequestException("At least one seat must be selected");
    }

    const totalTickets = tickets.adult + tickets.child + tickets.senior;
    const uniqueSeatIds = Array.from(new Set(payload.seatIds));
    if (uniqueSeatIds.length !== payload.seatIds.length) {
      throw new BadRequestException("Each selected seat must be unique");
    }

    if (payload.seatIds.length !== totalTickets) {
      throw new BadRequestException("Seat count must match total ticket count");
    }

    await this.assertValidSeatIdsForShowtime(payload.movieId, payload.showtime, uniqueSeatIds);

    return tickets;
  }

  /**
   * Resolves the hall for a given movie+showtime.
   * Primary: uses the showroomId stored on the showtime record.
   * Fallback: if the showtime's showroomId doesn't resolve to a showroom
   *           (e.g. seeded showtimes reference IDs that no longer exist),
   *           falls back to the movie's assigned showroomId.
   */
  async resolveShowroomForShowtime(movieId, showtime) {
    if (!showtime || String(showtime).trim().length === 0) {
      throw new BadRequestException("showtime is required");
    }

    const showtimeRecord = await this.showtimesService.findByMovieAndStartAt(movieId, showtime);

    // Try the showtime's own showroomId first
    if (showtimeRecord?.showroomId) {
      const showroom = await this.showroomsService.findById(showtimeRecord.showroomId);
      if (showroom?.layout) {
        return { showroom, showtime: showtimeRecord };
      }
    }

    // Fallback: use the movie's assigned showroomId (handles seeded showtimes
    // whose showroomId no longer exists in Firestore)
    const movie = await this.moviesService.findById(Number(movieId));
    if (movie?.showroomId) {
      const showroom = await this.showroomsService.findById(movie.showroomId);
      if (showroom?.layout) {
        return { showroom, showtime: showtimeRecord ?? null };
      }
    }

    // Last resort: use any available showroom
    const allShowrooms = await this.showroomsService.findAll();
    const fallback = allShowrooms.find((r) => r?.layout);
    if (fallback) {
      return { showroom: fallback, showtime: showtimeRecord ?? null };
    }

    throw new BadRequestException("The hall for this showtime could not be found");
  }

  async _sendBookingConfirmationEmail(booking, savedCard, notificationEmail) {
    if (!this.profileNotificationService) {
      console.warn("[BookingsService] profileNotificationService not injected — skipping confirmation email.");
      return;
    }
    const toEmail = typeof notificationEmail === "string" && notificationEmail.trim().length > 0
      ? notificationEmail
      : booking.customerEmail;
    if (typeof toEmail !== "string" || toEmail.trim().length === 0) return;
    console.log(`[BookingsService] Sending booking confirmation email to ${toEmail} for booking ${booking.bookingId}`);

    let hallName = "N/A";
    try {
      const { showroom } = await this.resolveShowroomForShowtime(booking.movieId, booking.showtime);
      if (showroom?.name) hallName = showroom.name;
    } catch {
      // best-effort
    }

    let movieTitle = "your movie";
    try {
      const movie = await this.moviesService.findById(Number(booking.movieId));
      if (movie?.title) movieTitle = movie.title;
    } catch {
      // best-effort
    }

    await this.profileNotificationService.sendBookingConfirmationEmail({
      toEmail,
      customerName: booking.customerName ?? booking.customerEmail,
      bookingId: booking.bookingId,
      movieTitle,
      showtime: booking.showtime,
      hallName,
      seatIds: booking.seatIds ?? [],
      tickets: booking.tickets ?? {},
      total: booking.total,
      paymentCard: savedCard
        ? { brand: savedCard.brand, last4: savedCard.last4 }
        : null,
      promoCode: booking.promoCode ?? null,
      discountPercent: booking.discountPercent ?? 0
    });
  }

  async assertValidSeatIdsForShowtime(movieId, showtime, seatIds) {
    // Validate seat ID format — must be "row-col" strings (e.g. "3-5")
    const badFormat = (Array.isArray(seatIds) ? seatIds : []).filter(
      (seatId) => typeof seatId !== "string" || !/^\d+-\d+$/.test(seatId)
    );
    if (badFormat.length > 0) {
      throw new BadRequestException(
        `Invalid seat ID format: ${badFormat.join(", ")}`
      );
    }

    // Validate against the hall layout when we can resolve the showroom.
    // If the showroom can't be determined (e.g. stale showroomId reference),
    // skip the grid check — the seat-conflict check in the caller still
    // prevents double-booking.
    let showroom = null;
    try {
      const result = await this.resolveShowroomForShowtime(movieId, showtime);
      showroom = result?.showroom ?? null;
    } catch {
      // Could not resolve showroom — skip grid validation
    }

    if (showroom?.layout) {
      const validSeatIds = new Set(this.showroomsService.generateSeatIds(showroom.layout));
      const invalidSeatIds = (Array.isArray(seatIds) ? seatIds : []).filter(
        (seatId) => !validSeatIds.has(seatId)
      );
      if (invalidSeatIds.length > 0) {
        throw new BadRequestException(
          `Invalid seat selection for this hall: ${invalidSeatIds.join(", ")}`
        );
      }
    }
  }
}

decorateClass(
  BookingsService,
  [Injectable()],
  [
    FirestoreService,
    MoviesService,
    AuthGuardService,
    DefaultPricingStrategy,
    ShowtimesService,
    PromoCodesService,
    ShowroomsService,
    ProfileNotificationService,
    SeatLocksService
  ]
);

export { BookingsService };
