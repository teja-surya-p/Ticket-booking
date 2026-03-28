import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException
} from "@nestjs/common";
import { FieldValue } from "firebase-admin/firestore";
import {
  FIRESTORE_COLLECTIONS,
  USER_ACCOUNT_STATUSES
} from "../common/constants.js";
import { decorateClass } from "../common/nest-metadata.js";
import { FirestoreService } from "../config/firestore.service.js";

class AuthService {
  constructor(firestoreService) {
    this.firestoreService = firestoreService;
  }

  async register(authorization, body = {}) {
    const userRecord = await this.getFirebaseUserFromAuthorizationHeader(authorization);
    return await this.upsertUserProfile(userRecord, body);
  }

  async syncVerification(authorization) {
    const userRecord = await this.getFirebaseUserFromAuthorizationHeader(authorization);
    return await this.upsertUserProfile(userRecord);
  }

  async getFirebaseUserFromAuthorizationHeader(authorization) {
    const token = this.extractBearerToken(authorization);

    try {
      const decodedToken = await this.firestoreService.auth().verifyIdToken(token);
      return await this.firestoreService.auth().getUser(decodedToken.uid);
    } catch (error) {
      throw new UnauthorizedException(
        error instanceof Error ? error.message : "Invalid Firebase bearer token"
      );
    }
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

  async upsertUserProfile(userRecord, body = {}) {
    const now = new Date().toISOString();
    const userRef = this.collection().doc(userRecord.uid);
    const existingSnapshot = await userRef.get();
    const existingData = existingSnapshot.exists ? existingSnapshot.data() : {};
    const status = userRecord.emailVerified
      ? USER_ACCOUNT_STATUSES.active
      : USER_ACCOUNT_STATUSES.inactive;
    const displayName = this.resolveDisplayName(userRecord, existingData, body);
    const email = this.resolveEmail(userRecord, existingData);

    if (!email) {
      throw new InternalServerErrorException("Firebase user email is required");
    }

    const profile = {
      uid: userRecord.uid,
      email,
      displayName,
      firstName: this.resolveOptionalString(body?.firstName, existingData?.firstName),
      lastName: this.resolveOptionalString(body?.lastName, existingData?.lastName),
      photoURL: this.resolveOptionalString(userRecord.photoURL, existingData?.photoURL),
      phoneNumber: this.resolveOptionalString(userRecord.phoneNumber, existingData?.phoneNumber),
      emailVerified: Boolean(userRecord.emailVerified),
      status,
      providerIds: Array.isArray(userRecord.providerData)
        ? userRecord.providerData
            .map((item) => item?.providerId)
            .filter((value) => typeof value === "string" && value.length > 0)
        : [],
      updatedAt: now,
      createdAt:
        typeof existingData?.createdAt === "string" && existingData.createdAt.trim().length > 0
          ? existingData.createdAt
          : now,
      password: FieldValue.delete(),
      passwordHash: FieldValue.delete(),
      passwordSalt: FieldValue.delete()
    };

    await userRef.set(profile, {
      merge: true
    });

    return {
      uid: profile.uid,
      email: profile.email,
      emailVerified: profile.emailVerified,
      status: profile.status
    };
  }

  resolveEmail(userRecord, existingData) {
    if (typeof userRecord.email === "string" && userRecord.email.trim().length > 0) {
      return userRecord.email.trim();
    }

    return this.resolveOptionalString(existingData?.email, "");
  }

  resolveDisplayName(userRecord, existingData, body) {
    const bodyDisplayName = this.resolveOptionalString(body?.displayName, "");
    if (bodyDisplayName) {
      return bodyDisplayName;
    }

    return this.resolveOptionalString(
      userRecord.displayName,
      this.resolveOptionalString(existingData?.displayName, "")
    );
  }

  resolveOptionalString(value, fallback = "") {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
  }

  collection() {
    return this.firestoreService.db().collection(FIRESTORE_COLLECTIONS.users);
  }
}

decorateClass(AuthService, [Injectable()], [FirestoreService]);

export { AuthService };
