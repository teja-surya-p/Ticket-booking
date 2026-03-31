import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import {
  FIRESTORE_COLLECTIONS,
  MAX_TICKETS_PER_BOOKING,
  TICKET_PRICING,
  BOOKING_SERVICE_FEE_RATE
} from "../common/constants.js";
import { decorateClass } from "../common/nest-metadata.js";
import { roundCurrency } from "../common/utils.js";
import { FirestoreService } from "../config/firestore.service.js";
import { toBookingEntity } from "../entities/booking.entity.js";
import { MoviesService } from "./movies.service.js";

class BookingsService {
  constructor(firestoreService, moviesService) {
    this.firestoreService = firestoreService;
    this.moviesService = moviesService;
  }

  async getSavedCard(query, authorization) {
    const { customerEmail, customerUid } = await this.requireAuthenticatedCustomer(
      query,
      authorization
    );
    const cards = await this.findCardsForCustomer(customerEmail, customerUid);

    return {
      customerUid,
      customerEmail,
      cards,
      maxCardsAllowed: 3
    };
  }

  async saveCard(payload, authorization) {
    const { customerEmail, customerUid } = await this.requireAuthenticatedCustomer(
      payload,
      authorization
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
        existingData?.cardFingerprint === cardFingerprint && typeof existingData?.cardToken === "string"
          ? existingData.cardToken
          : randomUUID(),
      cardFingerprint,
      createdAt: typeof existingData?.createdAt === "string" ? existingData.createdAt : now,
      updatedAt: now
    };

    await this.cardCollection().doc(cardDocId).set(cardRecord);
    const cards = await this.findCardsForCustomer(customerEmail, customerUid);

    return {
      customerUid,
      customerEmail,
      cards,
      savedCardId: cardDocId,
      maxCardsAllowed: 3
    };
  }

  async deleteCard(cardId, authorization) {
    const normalizedCardId = this.normalizePaymentCardId(cardId);
    const { customerEmail, customerUid } = await this.requireAuthenticatedCustomer(
      {},
      authorization
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

  async getReservedSeats(query) {
    const movie = await this.moviesService.findById(query.movieId);

    if (!query.showtime || !movie.showtimes.includes(query.showtime)) {
      throw new BadRequestException("Invalid showtime for the selected movie");
    }

    const bookings = await this.findBookingsByShowtime(query.movieId, query.showtime);
    const reservedSeats = Array.from(
      new Set(bookings.flatMap((booking) => booking.seatIds))
    ).sort();

    return {
      movieId: query.movieId,
      showtime: query.showtime,
      reservedSeats
    };
  }

  getPricing() {
    return {
      adult: TICKET_PRICING.adult,
      child: TICKET_PRICING.child,
      senior: TICKET_PRICING.senior
    };
  }

  async getQuote(payload) {
    const tickets = await this.validateAndNormalizePayload(payload);
    const subtotal = roundCurrency(
      tickets.adult * TICKET_PRICING.adult +
        tickets.child * TICKET_PRICING.child +
        tickets.senior * TICKET_PRICING.senior
    );
    const serviceFee = roundCurrency(subtotal * BOOKING_SERVICE_FEE_RATE);
    const total = roundCurrency(subtotal + serviceFee);

    return {
      subtotal,
      serviceFee,
      total,
      currency: "USD"
    };
  }

  async createBooking(payload, authorization) {
    const { customerEmail, customerUid } = await this.requireAuthenticatedCustomer(
      payload,
      authorization
    );
    const customerName = this.normalizeCustomerName(payload?.customerName);
    const paymentCardId = this.normalizePaymentCardId(payload?.paymentCardId);
    await this.validateAndNormalizePayload(payload);
    const savedCard = await this.requireSavedCard(customerEmail, paymentCardId, customerUid);
    const uniqueSeatIds = Array.from(new Set(payload.seatIds));
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

    const quote = await this.getQuote(payload);
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
      total: quote.total,
      createdAt: new Date().toISOString()
    });

    await this.collection().doc(booking.bookingId).set(booking);
    return {
      bookingId: booking.bookingId,
      status: booking.status,
      total: booking.total
    };
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

  collection() {
    return this.firestoreService.db().collection(FIRESTORE_COLLECTIONS.bookings);
  }

  cardCollection() {
    return this.firestoreService.db().collection(FIRESTORE_COLLECTIONS.paymentCards);
  }

  async findCardDocsForCustomer(customerEmail, customerUid) {
    const normalizedUid = this.normalizeCustomerUid(customerUid);
    const [uidSnapshot, emailSnapshot] = await Promise.all([
      normalizedUid
        ? this.cardCollection().where("customerUid", "==", normalizedUid).get()
        : Promise.resolve(null),
      this.cardCollection().where("customerEmail", "==", customerEmail).get()
    ]);

    const docsById = new Map();
    const attachDoc = (doc) => {
      docsById.set(doc.id, {
        id: doc.id,
        data: doc.data()
      });
    };

    if (uidSnapshot) {
      uidSnapshot.docs.forEach(attachDoc);
    }
    emailSnapshot.docs.forEach(attachDoc);

    if (normalizedUid) {
      const legacyEmailOnlyDocs = emailSnapshot.docs.filter((doc) => {
        const existingUid = this.normalizeCustomerUid(doc.data()?.customerUid);
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
          if (!existing) {
            return;
          }

          docsById.set(doc.id, {
            ...existing,
            data: {
              ...existing.data,
              customerUid: normalizedUid
            }
          });
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
      customerEmail: this.normalizeCustomerEmail(data?.customerEmail),
      cardholderName:
        typeof data?.cardholderName === "string" && data.cardholderName.trim().length > 0
          ? data.cardholderName.trim()
          : "Card Holder",
      brand: typeof data?.brand === "string" && data.brand.trim().length > 0 ? data.brand : "Unknown",
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

  normalizeCustomerEmail(value) {
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

  normalizeOptionalCustomerEmail(value) {
    if (typeof value !== "string" || value.trim().length === 0) {
      return null;
    }

    return this.normalizeCustomerEmail(value);
  }

  normalizeCustomerUid(value) {
    if (typeof value !== "string") {
      return null;
    }

    const customerUid = value.trim();
    return customerUid.length > 0 ? customerUid : null;
  }

  normalizeCustomerName(value) {
    if (typeof value !== "string") {
      return null;
    }

    const customerName = value.trim();
    return customerName.length > 0 ? customerName : null;
  }

  normalizePaymentCardId(value) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new BadRequestException("paymentCardId is required");
    }

    return value.trim();
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

  async requireAuthenticatedCustomer(payload, authorization) {
    const token = this.extractBearerToken(authorization);
    let decodedToken;

    try {
      decodedToken = await this.firestoreService.auth().verifyIdToken(token);
    } catch (error) {
      throw new UnauthorizedException(
        error instanceof Error ? error.message : "Invalid or expired Firebase ID token"
      );
    }

    const authenticatedUid = this.normalizeCustomerUid(decodedToken?.uid);
    if (!authenticatedUid) {
      throw new UnauthorizedException("Authenticated user uid is missing");
    }

    let authenticatedEmail = this.normalizeOptionalCustomerEmail(decodedToken?.email);
    if (!authenticatedEmail) {
      try {
        const userRecord = await this.firestoreService.auth().getUser(authenticatedUid);
        authenticatedEmail = this.normalizeOptionalCustomerEmail(userRecord?.email);
      } catch (error) {
        throw new UnauthorizedException(
          error instanceof Error ? error.message : "Unable to load authenticated user profile"
        );
      }
    }

    if (!authenticatedEmail) {
      throw new UnauthorizedException("Authenticated user email is missing");
    }

    const requestedUid = this.normalizeCustomerUid(payload?.customerUid);
    if (requestedUid && requestedUid !== authenticatedUid) {
      throw new UnauthorizedException("customerUid does not match authenticated user");
    }

    const requestedEmail = this.normalizeOptionalCustomerEmail(payload?.customerEmail);
    if (requestedEmail && requestedEmail !== authenticatedEmail) {
      throw new UnauthorizedException("customerEmail does not match authenticated user");
    }

    return {
      customerUid: authenticatedUid,
      customerEmail: authenticatedEmail
    };
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
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth() + 1;
    if (
      expYear < currentYear ||
      (expYear === currentYear && rawMonth < currentMonth)
    ) {
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

  buildCardFingerprint(customerEmail, cardNumber) {
    return createHash("sha256").update(`${customerEmail}:${cardNumber}`).digest("hex");
  }

  passesLuhn(cardNumber) {
    let sum = 0;
    let shouldDouble = false;

    for (let index = cardNumber.length - 1; index >= 0; index -= 1) {
      let digit = Number(cardNumber[index]);
      if (!Number.isFinite(digit)) {
        return false;
      }

      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      shouldDouble = !shouldDouble;
    }

    return sum % 10 === 0;
  }

  detectCardBrand(cardNumber) {
    if (/^4\d{12}(\d{3})?(\d{3})?$/.test(cardNumber)) {
      return "Visa";
    }

    if (
      /^(5[1-5]\d{14}|2(2[2-9]\d{12}|[3-6]\d{13}|7([01]\d{12}|20\d{12})))$/.test(
        cardNumber
      )
    ) {
      return "Mastercard";
    }

    if (/^3[47]\d{13}$/.test(cardNumber)) {
      return "American Express";
    }

    if (/^6(?:011|5\d{2})\d{12}$/.test(cardNumber)) {
      return "Discover";
    }

    return "Card";
  }

  async findBookingsByShowtime(movieId, showtime) {
    const [numberIdSnapshot, stringIdSnapshot] = await Promise.all([
      this.collection().where("movieId", "==", movieId).where("showtime", "==", showtime).get(),
      this.collection().where("movieId", "==", String(movieId)).where("showtime", "==", showtime).get()
    ]);
    const docs = [...numberIdSnapshot.docs, ...stringIdSnapshot.docs];

    return docs
      .map((doc) => doc.data())
      .map((data) => ({
        seatIds: Array.isArray(data.seatIds)
          ? data.seatIds.filter((value) => typeof value === "string")
          : Array.isArray(data.seats)
            ? data.seats.filter((value) => typeof value === "string")
            : []
      }));
  }

  async validateAndNormalizePayload(payload) {
    const movie = await this.moviesService.findById(payload.movieId);

    if (!payload.showtime || payload.showtime.trim().length === 0) {
      throw new BadRequestException("showtime is required");
    }

    if (!movie.showtimes.includes(payload.showtime)) {
      throw new BadRequestException("Invalid showtime for the selected movie");
    }

    if (!Array.isArray(payload.seatIds) || payload.seatIds.length === 0) {
      throw new BadRequestException("At least one seat must be selected");
    }

    const adult = Number(payload.tickets?.adult ?? 0);
    const child = Number(payload.tickets?.child ?? 0);
    const senior = Number(payload.tickets?.senior ?? 0);

    if ([adult, child, senior].some((value) => value < 0 || !Number.isFinite(value))) {
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

    const uniqueSeatIds = Array.from(new Set(payload.seatIds));
    if (uniqueSeatIds.length !== payload.seatIds.length) {
      throw new BadRequestException("Each selected seat must be unique");
    }

    if (payload.seatIds.length !== totalTickets) {
      throw new BadRequestException("Seat count must match total ticket count");
    }

    return { adult, child, senior };
  }
}

decorateClass(BookingsService, [Injectable()], [FirestoreService, MoviesService]);

export { BookingsService };
