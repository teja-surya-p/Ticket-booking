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

  async create({ code, discountPercent }) {
    const normalizedCode = this.normalizeCode(code);
    const percent = this.normalizeDiscountPercent(discountPercent);

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
      createdAt: now
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

    if (
      normalizedUserId &&
      Array.isArray(data.usedByUserIds) &&
      data.usedByUserIds.includes(normalizedUserId)
    ) {
      throw new ConflictException("This promo code has already been used.");
    }

    return { codeId: data.codeId, discountPercent: data.discountPercent };
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
}

decorateClass(PromoCodesService, [Injectable()], [FirestoreService]);

export { PromoCodesService };
