import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { FIRESTORE_COLLECTIONS } from "../common/constants.js";
import { decorateClass } from "../common/nest-metadata.js";
import { FirestoreService } from "../config/firestore.service.js";
import { AuthGuardService } from "./auth-guard.service.js";
import { MoviesService } from "./movies.service.js";

/**
 * FavoritesService
 *
 * SRP: Manages user favorites. Auth is delegated to AuthGuardService,
 *      removing the previously duplicated token-verification logic.
 */
class FavoritesService {
  constructor(firestoreService, moviesService, authGuardService) {
    this.firestoreService = firestoreService;
    this.moviesService = moviesService;
    this.authGuardService = authGuardService;
  }

  async getFavorites(authorization) {
    const customer = await this.authGuardService.requireAuthenticatedCustomer(authorization, {});
    const favorites = await this.findFavoritesForCustomer(
      customer.customerEmail,
      customer.customerUid
    );
    return this.buildResponse(customer, favorites);
  }

  async addFavorite(authorization, body = {}) {
    const customer = await this.authGuardService.requireAuthenticatedCustomer(authorization, {});
    const movieId = this.normalizeMovieId(body?.movieId);
    await this.moviesService.findById(movieId);

    const existingFavorite = await this.findFavoriteDocForCustomer(
      customer.customerEmail,
      customer.customerUid,
      movieId
    );
    const now = new Date().toISOString();

    if (existingFavorite) {
      await this.collection().doc(existingFavorite.id).set(
        { customerUid: customer.customerUid, customerEmail: customer.customerEmail, movieId, updatedAt: now },
        { merge: true }
      );
    } else {
      const favoriteId = randomUUID();
      await this.collection().doc(favoriteId).set({
        favoriteId,
        customerUid: customer.customerUid,
        customerEmail: customer.customerEmail,
        movieId,
        createdAt: now,
        updatedAt: now
      });
    }

    const favorites = await this.findFavoritesForCustomer(
      customer.customerEmail,
      customer.customerUid
    );
    return { ...this.buildResponse(customer, favorites), addedMovieId: movieId };
  }

  async removeFavorite(authorization, movieIdInput) {
    const customer = await this.authGuardService.requireAuthenticatedCustomer(authorization, {});
    const movieId = this.normalizeMovieId(movieIdInput);
    const existingFavorite = await this.findFavoriteDocForCustomer(
      customer.customerEmail,
      customer.customerUid,
      movieId
    );

    if (existingFavorite) {
      await this.collection().doc(existingFavorite.id).delete();
    }

    const favorites = await this.findFavoritesForCustomer(
      customer.customerEmail,
      customer.customerUid
    );
    return { ...this.buildResponse(customer, favorites), removedMovieId: movieId };
  }

  collection() {
    return this.firestoreService.db().collection(FIRESTORE_COLLECTIONS.favorites);
  }

  buildResponse(customer, favorites) {
    return {
      customerUid: customer.customerUid,
      customerEmail: customer.customerEmail,
      favorites,
      movieIds: favorites.map((f) => f.movieId)
    };
  }

  async findFavoriteDocsForCustomer(customerEmail, customerUid) {
    const normalizedUid = this.authGuardService.normalizeCustomerUid(customerUid);
    const [uidSnapshot, emailSnapshot] = await Promise.all([
      normalizedUid
        ? this.collection().where("customerUid", "==", normalizedUid).get()
        : Promise.resolve(null),
      this.collection().where("customerEmail", "==", customerEmail).get()
    ]);

    const docsById = new Map();
    const attachDoc = (doc) => { docsById.set(doc.id, { id: doc.id, data: doc.data() }); };

    if (uidSnapshot) uidSnapshot.docs.forEach(attachDoc);
    emailSnapshot.docs.forEach(attachDoc);

    if (normalizedUid) {
      const legacyEmailOnlyDocs = emailSnapshot.docs.filter(
        (doc) => !this.authGuardService.normalizeCustomerUid(doc.data()?.customerUid)
      );

      if (legacyEmailOnlyDocs.length > 0) {
        await Promise.all(
          legacyEmailOnlyDocs.map((doc) =>
            this.collection().doc(doc.id).set({ customerUid: normalizedUid }, { merge: true })
          )
        );

        legacyEmailOnlyDocs.forEach((doc) => {
          const existing = docsById.get(doc.id);
          if (!existing) return;
          docsById.set(doc.id, {
            ...existing,
            data: { ...existing.data, customerUid: normalizedUid }
          });
        });
      }
    }

    return Array.from(docsById.values());
  }

  async findFavoriteDocForCustomer(customerEmail, customerUid, movieId) {
    const docs = await this.findFavoriteDocsForCustomer(customerEmail, customerUid);
    return docs.find((doc) => this.parseOptionalMovieId(doc.data?.movieId) === movieId) ?? null;
  }

  async findFavoritesForCustomer(customerEmail, customerUid) {
    const docs = await this.findFavoriteDocsForCustomer(customerEmail, customerUid);
    return docs
      .map((doc) => this.toFavoriteEntity(doc.data, doc.id))
      .filter((f) => f !== null)
      .sort((a, b) => {
        const aTime = Date.parse(a.updatedAt ?? a.createdAt ?? "");
        const bTime = Date.parse(b.updatedAt ?? b.createdAt ?? "");
        return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
      });
  }

  toFavoriteEntity(data, fallbackFavoriteId) {
    const movieId = this.parseOptionalMovieId(data?.movieId);
    if (!movieId) return null;

    return {
      favoriteId:
        typeof data?.favoriteId === "string" && data.favoriteId.trim().length > 0
          ? data.favoriteId.trim()
          : fallbackFavoriteId,
      movieId,
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

  parseOptionalMovieId(value) {
    const numericMovieId = Number(value);
    return Number.isInteger(numericMovieId) && numericMovieId > 0 ? numericMovieId : null;
  }

  normalizeMovieId(value) {
    const movieId = this.parseOptionalMovieId(value);
    if (!movieId) throw new BadRequestException("movieId is invalid");
    return movieId;
  }
}

decorateClass(FavoritesService, [Injectable()], [FirestoreService, MoviesService, AuthGuardService]);

export { FavoritesService };
