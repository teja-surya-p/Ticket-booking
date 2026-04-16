import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { FIRESTORE_COLLECTIONS } from "../common/constants.js";
import { decorateClass } from "../common/nest-metadata.js";
import { FirestoreService } from "../config/firestore.service.js";
import { toShowroomEntity } from "../entities/showroom.entity.js";
import { MoviesService } from "./movies.service.js";
import { ShowtimesService } from "./showtimes.service.js";

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
  constructor(firestoreService, moviesService, showtimesService) {
    this.firestoreService = firestoreService;
    this.moviesService = moviesService;
    this.showtimesService = showtimesService;
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

  async create(dto = {}) {
    const name = await this.normalizeUniqueName(dto?.name);
    const layout = this.normalizeLayout(dto?.layout ?? dto);
    const now = new Date().toISOString();
    const showroom = toShowroomEntity({
      showroomId: randomUUID(),
      name,
      layout,
      createdAt: now,
      updatedAt: now
    });

    await this.collection().doc(showroom.showroomId).set(showroom);
    return showroom;
  }

  async update(showroomId, dto = {}) {
    const normalizedShowroomId = this.normalizeShowroomId(showroomId);
    const existing = await this.findExistingShowroom(normalizedShowroomId);
    const hasLayoutInput = this.hasLayoutInput(dto?.layout ?? dto);
    const nextLayout = hasLayoutInput
      ? this.normalizeLayout(dto?.layout ?? dto)
      : this.normalizeLayout(existing.layout);

    if (hasLayoutInput && this.hasLayoutChanged(existing.layout, nextLayout)) {
      await this.assertLayoutCanBeChanged(normalizedShowroomId);
    }

    const updatedShowroom = toShowroomEntity({
      ...existing,
      showroomId: normalizedShowroomId,
      name: await this.normalizeUniqueName(dto?.name ?? existing.name, normalizedShowroomId),
      layout: nextLayout,
      updatedAt: new Date().toISOString()
    });

    await this.collection().doc(normalizedShowroomId).set(updatedShowroom);
    return updatedShowroom;
  }

  async delete(showroomId) {
    const normalizedShowroomId = this.normalizeShowroomId(showroomId);
    await this.findExistingShowroom(normalizedShowroomId);

    const [assignedMovies, scheduledShowtimes] = await Promise.all([
      this.moviesService.findByShowroomId(normalizedShowroomId),
      this.showtimesService.findByShowroomId(normalizedShowroomId)
    ]);

    if (assignedMovies.length > 0) {
      throw new ConflictException(
        `Cannot delete this hall because ${assignedMovies.length} movie${
          assignedMovies.length === 1 ? " is" : "s are"
        } assigned to it`
      );
    }

    if (scheduledShowtimes.length > 0) {
      throw new ConflictException(
        `Cannot delete this hall because ${scheduledShowtimes.length} showtime${
          scheduledShowtimes.length === 1 ? " is" : "s are"
        } scheduled for it`
      );
    }

    await this.collection().doc(normalizedShowroomId).delete();
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
    const normalizedLayout = this.normalizeLayout(layout);
    const seats = [];
    for (let row = 1; row <= normalizedLayout.rows; row++) {
      for (let col = 1; col <= normalizedLayout.cols; col++) {
        seats.push(`${row}-${col}`);
      }
    }
    return seats;
  }

  async findExistingShowroom(showroomId) {
    const showroom = await this.findById(showroomId);
    if (!showroom) {
      throw new NotFoundException(`Hall "${showroomId}" not found`);
    }
    return showroom;
  }

  async normalizeUniqueName(value, excludeShowroomId = null) {
    const name = this.normalizeName(value);
    const allShowrooms = await this.findAll();
    const normalizedName = name.toLowerCase();
    const duplicate = allShowrooms.find((showroom) => {
      if (excludeShowroomId && showroom.showroomId === excludeShowroomId) {
        return false;
      }

      return String(showroom.name ?? "").trim().toLowerCase() === normalizedName;
    });

    if (duplicate) {
      throw new ConflictException(`A hall named "${name}" already exists`);
    }

    return name;
  }

  normalizeName(value) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new BadRequestException("Hall name is required");
    }

    return value.trim();
  }

  normalizeShowroomId(value) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new BadRequestException("showroomId is required");
    }

    return value.trim();
  }

  hasLayoutInput(value) {
    return Boolean(
      value &&
        typeof value === "object" &&
        (Object.prototype.hasOwnProperty.call(value, "rows") ||
          Object.prototype.hasOwnProperty.call(value, "cols") ||
          Object.prototype.hasOwnProperty.call(value, "totalSeats"))
    );
  }

  normalizeLayout(value) {
    const source = value && typeof value === "object" ? value : {};
    const rows = Number(source.rows);
    const cols = Number(source.cols);

    if (!Number.isInteger(rows) || rows <= 0) {
      throw new BadRequestException("rows must be a positive integer");
    }

    if (!Number.isInteger(cols) || cols <= 0) {
      throw new BadRequestException("cols must be a positive integer");
    }

    return {
      rows,
      cols,
      totalSeats: rows * cols
    };
  }

  hasLayoutChanged(currentLayout, nextLayout) {
    const current = this.normalizeLayout(currentLayout);
    const next = this.normalizeLayout(nextLayout);

    return current.rows !== next.rows || current.cols !== next.cols;
  }

  async assertLayoutCanBeChanged(showroomId) {
    const scheduledShowtimes = await this.showtimesService.findByShowroomId(showroomId);
    const now = new Date().toISOString();
    const upcomingShowtimes = scheduledShowtimes.filter(
      (showtime) => typeof showtime?.startAt === "string" && showtime.startAt >= now
    );

    if (upcomingShowtimes.length > 0) {
      throw new ConflictException(
        "Cannot change the seat layout for a hall that still has scheduled showtimes"
      );
    }
  }
}

decorateClass(ShowroomsService, [Injectable()], [FirestoreService, MoviesService, ShowtimesService]);

export { ShowroomsService };
