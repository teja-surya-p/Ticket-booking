import {
  ForbiddenException,
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
import { ProfileNotificationService } from "./profile-notification.service.js";

class AuthService {
  constructor(firestoreService, profileNotificationService) {
    this.firestoreService = firestoreService;
    this.profileNotificationService = profileNotificationService;
  }

  async register(authorization, body = {}) {
    const userRecord = await this.getFirebaseUserFromAuthorizationHeader(authorization);
    return await this.upsertUserProfile(userRecord, body);
  }

  async syncVerification(authorization) {
    const userRecord = await this.getFirebaseUserFromAuthorizationHeader(authorization);
    const profile = await this.upsertUserProfile(userRecord);

    if (
      !profile.emailVerified ||
      String(profile.status).trim().toLowerCase() !== USER_ACCOUNT_STATUSES.active.toLowerCase()
    ) {
      throw new ForbiddenException({
        statusCode: 403,
        code: "UNVERIFIED_ACCOUNT",
        message: "unverified",
        error: "Forbidden"
      });
    }

    return profile;
  }

  async getProfile(authorization) {
    const userRecord = await this.getFirebaseUserFromAuthorizationHeader(authorization);
    const userRef = this.collection().doc(userRecord.uid);
    let snapshot = await userRef.get();

    if (!snapshot.exists) {
      await this.upsertUserProfile(userRecord);
      snapshot = await userRef.get();
    }

    const data = snapshot.exists ? snapshot.data() : {};
    const status = userRecord.emailVerified
      ? USER_ACCOUNT_STATUSES.active
      : USER_ACCOUNT_STATUSES.inactive;

    return this.toProfileResponse({
      ...data,
      uid: userRecord.uid,
      email: this.resolveEmail(userRecord, data),
      emailVerified: Boolean(userRecord.emailVerified),
      status
    });
  }

  async updateProfile(authorization, body = {}) {
    const userRecord = await this.getFirebaseUserFromAuthorizationHeader(authorization);
    const previousProfile = await this.getProfile(authorization);

    await this.upsertUserProfile(userRecord, body);
    const updatedProfile = await this.getProfile(authorization);
    const changes = this.collectProfileChanges(previousProfile, updatedProfile);

    if (changes.length > 0) {
      const displayName = this.resolveOptionalString(
        [updatedProfile.firstName, updatedProfile.lastName].filter(Boolean).join(" "),
        this.resolveOptionalString(updatedProfile.displayName, "there")
      );

      try {
        const emailResult = await this.profileNotificationService.sendProfileUpdatedEmail({
          toEmail: updatedProfile.email,
          displayName,
          changes,
          updatedAt: updatedProfile.updatedAt
        });

        if (!emailResult?.sent) {
          console.warn(
            `[AuthService] Profile update email was not sent. Delivery channel: ${emailResult?.channel ?? "unknown"}.`
          );
        }
      } catch (error) {
        console.error(
          "[AuthService] Failed to send profile update email:",
          error instanceof Error ? error.message : error
        );
      }
    }

    return updatedProfile;
  }

  async notifyPasswordChanged(authorization) {
    const profile = await this.getProfile(authorization);
    const changedAt = new Date().toISOString();
    const displayName = this.resolveOptionalString(
      [profile.firstName, profile.lastName].filter(Boolean).join(" "),
      this.resolveOptionalString(profile.displayName, "there")
    );

    try {
      const emailResult = await this.profileNotificationService.sendPasswordChangedEmail({
        toEmail: profile.email,
        displayName,
        changedAt
      });

      if (!emailResult?.sent) {
        console.warn(
          `[AuthService] Password change email was not sent. Delivery channel: ${emailResult?.channel ?? "unknown"}.`
        );
      }

      return {
        notified: Boolean(emailResult?.sent),
        channel: emailResult?.channel ?? "unknown",
        changedAt
      };
    } catch (error) {
      console.error(
        "[AuthService] Failed to send password change email:",
        error instanceof Error ? error.message : error
      );

      return {
        notified: false,
        channel: "unknown",
        changedAt
      };
    }
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
    const resolvedPhone = this.resolveOptionalString(
      body?.phone,
      this.resolveOptionalString(
        existingData?.phone,
        this.resolveOptionalString(
          existingData?.phoneNumber,
          this.resolveOptionalString(userRecord.phoneNumber, "")
        )
      )
    );
    const resolvedAddress = this.resolveAddress(
      body?.address,
      this.resolveAddress(existingData?.address, null)
    );
    const promotionsOptIn =
      typeof body?.promotionsOptIn === "boolean"
        ? body.promotionsOptIn
        : Boolean(existingData?.promotionsOptIn);

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
      phone: resolvedPhone,
      phoneNumber: resolvedPhone,
      address: resolvedAddress,
      promotionsOptIn,
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

  resolveAddress(value, fallback = null) {
    if (!value || typeof value !== "object") {
      return fallback;
    }

    const address = {
      street: this.resolveOptionalString(value.street, ""),
      city: this.resolveOptionalString(value.city, ""),
      state: this.resolveOptionalString(value.state, ""),
      zip: this.resolveOptionalString(value.zip, "")
    };

    return Object.values(address).some(Boolean) ? address : fallback;
  }

  toProfileResponse(data = {}) {
    const phone = this.resolveOptionalString(
      data?.phone,
      this.resolveOptionalString(data?.phoneNumber, "")
    );

    return {
      uid: this.resolveOptionalString(data?.uid, ""),
      email: this.resolveOptionalString(data?.email, ""),
      displayName: this.resolveOptionalString(data?.displayName, ""),
      firstName: this.resolveOptionalString(data?.firstName, ""),
      lastName: this.resolveOptionalString(data?.lastName, ""),
      phone,
      phoneNumber: phone,
      address: this.resolveAddress(data?.address, null),
      promotionsOptIn: Boolean(data?.promotionsOptIn),
      photoURL: this.resolveOptionalString(data?.photoURL, ""),
      emailVerified: Boolean(data?.emailVerified),
      status: this.resolveOptionalString(data?.status, USER_ACCOUNT_STATUSES.inactive),
      providerIds: Array.isArray(data?.providerIds)
        ? data.providerIds.filter((value) => typeof value === "string" && value.length > 0)
        : [],
      createdAt: this.resolveOptionalString(data?.createdAt, ""),
      updatedAt: this.resolveOptionalString(data?.updatedAt, "")
    };
  }

  toAddressText(address) {
    if (!address || typeof address !== "object") {
      return "Not provided";
    }

    const parts = [
      this.resolveOptionalString(address.street, ""),
      this.resolveOptionalString(address.city, ""),
      this.resolveOptionalString(address.state, ""),
      this.resolveOptionalString(address.zip, "")
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(", ") : "Not provided";
  }

  toText(value) {
    if (typeof value === "boolean") {
      return value ? "Enabled" : "Disabled";
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : "Not provided";
    }

    return "Not provided";
  }

  collectProfileChanges(previousProfile = {}, updatedProfile = {}) {
    const comparisons = [
      {
        label: "First Name",
        before: this.toText(previousProfile.firstName),
        after: this.toText(updatedProfile.firstName)
      },
      {
        label: "Last Name",
        before: this.toText(previousProfile.lastName),
        after: this.toText(updatedProfile.lastName)
      },
      {
        label: "Mobile Number",
        before: this.toText(previousProfile.phone),
        after: this.toText(updatedProfile.phone)
      },
      {
        label: "Address",
        before: this.toAddressText(previousProfile.address),
        after: this.toAddressText(updatedProfile.address)
      },
      {
        label: "Promotions",
        before: this.toText(Boolean(previousProfile.promotionsOptIn)),
        after: this.toText(Boolean(updatedProfile.promotionsOptIn))
      }
    ];

    return comparisons.filter((item) => item.before !== item.after);
  }

  collection() {
    return this.firestoreService.db().collection(FIRESTORE_COLLECTIONS.users);
  }
}

decorateClass(AuthService, [Injectable()], [FirestoreService, ProfileNotificationService]);

export { AuthService };
