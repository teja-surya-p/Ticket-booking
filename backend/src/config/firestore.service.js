import { Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { applicationDefault, cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { decorateClass } from "../common/nest-metadata.js";

class FirestoreService {
  constructor() {
    this.logger = new Logger(FirestoreService.name);
    this.app = this.initializeFirebaseApp();
    this.authClient = getAuth(this.app);
    this.firestore = getFirestore(this.app);
  }

  db() {
    if (!this.firestore) {
      throw new InternalServerErrorException("Firestore is not initialized.");
    }

    return this.firestore;
  }

  auth() {
    if (!this.authClient) {
      throw new InternalServerErrorException("Firebase Auth is not initialized.");
    }

    return this.authClient;
  }

  isEnabled() {
    return true;
  }
  initializeFirebaseApp() {
    if (getApps().length > 0) {
      return getApp();
    }

    const projectId =
      process.env.FIREBASE_PROJECT_ID ??
      process.env.GOOGLE_CLOUD_PROJECT ??
      process.env.GCLOUD_PROJECT;
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const explicitAdcPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const homeDir = process.env.HOME;
    const gcloudLinuxAdcPath = homeDir
      ? join(homeDir, ".config", "gcloud", "application_default_credentials.json")
      : "";
    const gcloudMacAdcPath = homeDir
      ? join(homeDir, "Library", "Application Support", "gcloud", "application_default_credentials.json")
      : "";
    const hasLocalAdc = Boolean(
      (gcloudLinuxAdcPath && existsSync(gcloudLinuxAdcPath)) ||
        (gcloudMacAdcPath && existsSync(gcloudMacAdcPath))
    );

    if (serviceAccountJson) {
      try {
        const credentials = JSON.parse(serviceAccountJson);
        return initializeApp({
          credential: cert(credentials),
          projectId: projectId ?? credentials.project_id
        });
      } catch (error) {
        throw new InternalServerErrorException(
          `Invalid FIREBASE_SERVICE_ACCOUNT_JSON: ${
            error instanceof Error ? error.message : "unknown parse error"
          }`
        );
      }
    }

    if (serviceAccountPath) {
      try {
        const raw = readFileSync(serviceAccountPath, "utf8");
        const credentials = JSON.parse(raw);
        return initializeApp({
          credential: cert(credentials),
          projectId: projectId ?? credentials.project_id
        });
      } catch (error) {
        throw new InternalServerErrorException(
          `Invalid FIREBASE_SERVICE_ACCOUNT_PATH: ${
            error instanceof Error ? error.message : "unknown read/parse error"
          }`
        );
      }
    }

    if (!projectId) {
      throw new InternalServerErrorException("Firebase is not configured. Set FIREBASE_PROJECT_ID.");
    }

    if (!explicitAdcPath && !hasLocalAdc) {
      throw new InternalServerErrorException(
        "Firebase credentials are not configured. Set FIREBASE_SERVICE_ACCOUNT_PATH (recommended), FIREBASE_SERVICE_ACCOUNT_JSON, or GOOGLE_APPLICATION_CREDENTIALS."
      );
    }

    if (explicitAdcPath && !existsSync(explicitAdcPath)) {
      throw new InternalServerErrorException(
        `GOOGLE_APPLICATION_CREDENTIALS points to a missing file: ${explicitAdcPath}`
      );
    }

    return initializeApp({
      credential: applicationDefault(),
      projectId
    });
  }
}

decorateClass(FirestoreService, [Injectable()]);

export { FirestoreService };
