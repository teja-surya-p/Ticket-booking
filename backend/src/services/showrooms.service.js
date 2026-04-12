import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { FIRESTORE_COLLECTIONS } from "../common/constants.js";
import { decorateClass } from "../common/nest-metadata.js";
import { FirestoreService } from "../config/firestore.service.js";
import { toShowroomEntity } from "../entities/showroom.entity.js";

/**
 * ShowroomsService
 *
 * SRP: Single responsibility — manage showroom definitions and seat layouts
 * in Firestore. Seeds 3 showrooms on startup if the collection is empty.
 *
 * DIP: Depends on FirestoreService (global provider) rather than the
 * firebase-admin SDK directly.
 */

const SEED_SHOWROOMS = [
  {
    showroomId: "showroom-1",
    name: "Standard Hall",
    layout: { rows: 8, cols: 10, totalSeats: 80 }
  },
  {
    showroomId: "showroom-2",
    name: "Premium Hall",
    layout: { rows: 6, cols: 8, totalSeats: 48 }
  },
  {
    showroomId: "showroom-3",
    name: "IMAX Hall",
    layout: { rows: 10, cols: 12, totalSeats: 120 }
  }
];

class ShowroomsService {
  constructor(firestoreService) {
    this.firestoreService = firestoreService;
  }

  /** Called automatically by NestJS after the module is initialized. */
  async onModuleInit() {
    await this.seedShowroomsIfEmpty();
  }

  async findAll() {
    const snapshot = await this.collection().orderBy("name").get();
    return snapshot.docs.map((doc) => toShowroomEntity(doc.data()));
  }

  async findById(showroomId) {
    const snapshot = await this.collection().doc(showroomId).get();
    return snapshot.exists ? toShowroomEntity(snapshot.data()) : null;
  }

  collection() {
    return this.firestoreService.db().collection(FIRESTORE_COLLECTIONS.showrooms);
  }

  async seedShowroomsIfEmpty() {
    const snapshot = await this.collection().limit(1).get();
    if (!snapshot.empty) {
      return;
    }

    const now = new Date().toISOString();
    const batch = this.firestoreService.db().batch();

    for (const seed of SEED_SHOWROOMS) {
      const docRef = this.collection().doc(seed.showroomId);
      batch.set(docRef, toShowroomEntity({ ...seed, createdAt: now, updatedAt: now }));
    }

    await batch.commit();
  }

  /**
   * Generates seat IDs for a grid layout (e.g. "1-1" … "8-10").
   * Kept here so the seat-map rendering contract is centralised.
   */
  generateSeatIds(layout) {
    const seats = [];
    for (let row = 1; row <= layout.rows; row++) {
      for (let col = 1; col <= layout.cols; col++) {
        seats.push(`${row}-${col}`);
      }
    }
    return seats;
  }
}

decorateClass(ShowroomsService, [Injectable()], [FirestoreService]);

export { ShowroomsService };
