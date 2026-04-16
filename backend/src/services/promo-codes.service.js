import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { FIRESTORE_COLLECTIONS } from "../common/constants.js";
import { decorateClass } from "../common/nest-metadata.js";
import { FirestoreService } from "../config/firestore.service.js";

/**
 * PromoCodesService
 *
 * Manages promo codes: creation (admin), validation (checkout), and single-use
 * enforcement per user.
 *
 * Each code can only be used once per userId. After a booking is confirmed with
 * a promo code, markUsed() atomically adds the userId to `usedByUserIds`.
 */
class PromoCodesService {
  constructor(firestoreService) {
    this.firestoreService = firestoreService;
  }

  async create({ code, discountPercent, expiresAt }) {
    const normalizedCode = this.normalizeCode(code);
    const percent = this.normalizeDiscountPercent(discountPercent);
    const normalizedExpiresAt = this.normalizeExpiresAt(expiresAt);

    const existing = await this.collection()
      .where("code", "==", normalizedCode)
      .limit(1)
      .get();

    if (!existing.empty) {
      throw new ConflictException(`Promo code "${normalizedCode}" already exists`);
    }

    const codeId = randomUUID();
    const now = new Date().toISOString();
    const record = {
      codeId,
      code: normalizedCode,
      discountPercent: percent,
      usedByUserIds: [],
      createdAt: now,
      ...(normalizedExpiresAt ? { expiresAt: normalizedExpiresAt } : {})
    };

    await this.collection().doc(codeId).set(record);
    return record;
  }

  async validate(code, userId) {
    const normalizedCode = this.normalizeCode(code);
    const normalizedUserId = typeof userId === "string" ? userId.trim() : "";

    const snapshot = await this.collection()
      .where("code", "==", normalizedCode)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new NotFoundException("Invalid promo code.");
    }

    const data = snapshot.docs[0].data();

    // Check expiry first
    if (data.expiresAt) {
      const expiry = new Date(data.expiresAt);
      if (!isNaN(expiry.getTime()) && new Date() > expiry) {
        throw new ConflictException("This promotion has expired.");
      }
    }

    // Check per-user usage
    if (
      normalizedUserId &&
      Array.isArray(data.usedByUserIds) &&
      data.usedByUserIds.includes(normalizedUserId)
    ) {
      throw new ConflictException("You have already used this promotion.");
    }

    return { codeId: data.codeId, discountPercent: data.discountPercent };
  }

  /**
   * Returns all promo codes that are neither expired nor already used by the given user.
   * Filters in memory to avoid composite Firestore indexes.
   */
  async findAvailable(userId) {
    const snapshot = await this.collection().get();
    const now = new Date();
    const normalizedUserId = typeof userId === "string" ? userId.trim() : "";

    return snapshot.docs
      .map((doc) => doc.data())
      .filter((data) => {
        // Filter out expired codes
        if (data.expiresAt) {
          const expiry = new Date(data.expiresAt);
          if (!isNaN(expiry.getTime()) && now > expiry) return false;
        }
        // Filter out codes already used by this user
        if (
          normalizedUserId &&
          Array.isArray(data.usedByUserIds) &&
          data.usedByUserIds.includes(normalizedUserId)
        ) {
          return false;
        }
        return true;
      })
      .map((data) => ({
        code: data.code,
        discountPercent: data.discountPercent,
        ...(data.expiresAt ? { expiresAt: data.expiresAt } : {})
      }));
  }

  async markUsed(codeId, userId) {
    const normalizedUserId = typeof userId === "string" ? userId.trim() : "";
    if (!normalizedUserId || !codeId) return;

    await this.collection()
      .doc(codeId)
      .update({ usedByUserIds: FieldValue.arrayUnion(normalizedUserId) });
  }

  collection() {
    return this.firestoreService.db().collection(FIRESTORE_COLLECTIONS.promoCodes);
  }

  normalizeCode(value) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new BadRequestException("Promo code is required");
    }
    return value.trim().toUpperCase();
  }

  normalizeDiscountPercent(value) {
    const num = Number(value);
    if (!Number.isInteger(num) || num < 1 || num > 100) {
      throw new BadRequestException("discountPercent must be an integer between 1 and 100");
    }
    return num;
  }

  normalizeExpiresAt(value) {
    if (value === undefined || value === null || value === "") return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new BadRequestException("expiresAt must be a valid date/time");
    }
    if (date <= new Date()) {
      throw new BadRequestException("expiresAt must be in the future");
    }
    return date.toISOString();
  }
}

decorateClass(PromoCodesService, [Injectable()], [FirestoreService]);

export { PromoCodesService };
