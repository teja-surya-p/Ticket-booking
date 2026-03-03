"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var FirestoreService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirestoreService = void 0;
const common_1 = require("@nestjs/common");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
let FirestoreService = FirestoreService_1 = class FirestoreService {
    constructor() {
        this.logger = new common_1.Logger(FirestoreService_1.name);
        this.localDataMode = process.env.USE_LOCAL_DATA === 'true';
        if (this.localDataMode) {
            this.logger.warn('USE_LOCAL_DATA=true detected. Firestore is disabled and in-memory local data mode is enabled.');
            this.app = null;
            this.firestore = null;
            return;
        }
        this.app = this.initializeFirebaseApp();
        this.firestore = (0, firestore_1.getFirestore)(this.app);
    }
    db() {
        if (!this.firestore) {
            throw new common_1.InternalServerErrorException('Firestore is disabled in local data mode. Set USE_LOCAL_DATA=false and configure Firebase credentials.');
        }
        return this.firestore;
    }
    isEnabled() {
        return !this.localDataMode;
    }
    initializeFirebaseApp() {
        if ((0, app_1.getApps)().length > 0) {
            return (0, app_1.getApp)();
        }
        const projectId = process.env.FIREBASE_PROJECT_ID ??
            process.env.GOOGLE_CLOUD_PROJECT ??
            process.env.GCLOUD_PROJECT;
        const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
        const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
        const explicitAdcPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        const homeDir = process.env.HOME;
        const gcloudLinuxAdcPath = homeDir ? (0, node_path_1.join)(homeDir, '.config', 'gcloud', 'application_default_credentials.json') : '';
        const gcloudMacAdcPath = homeDir ? (0, node_path_1.join)(homeDir, 'Library', 'Application Support', 'gcloud', 'application_default_credentials.json') : '';
        const hasLocalAdc = Boolean((gcloudLinuxAdcPath && (0, node_fs_1.existsSync)(gcloudLinuxAdcPath)) ||
            (gcloudMacAdcPath && (0, node_fs_1.existsSync)(gcloudMacAdcPath)));
        if (serviceAccountJson) {
            try {
                const credentials = JSON.parse(serviceAccountJson);
                return (0, app_1.initializeApp)({
                    credential: (0, app_1.cert)(credentials),
                    projectId: projectId ?? credentials.project_id,
                });
            }
            catch (error) {
                throw new common_1.InternalServerErrorException(`Invalid FIREBASE_SERVICE_ACCOUNT_JSON: ${error instanceof Error ? error.message : 'unknown parse error'}`);
            }
        }
        if (serviceAccountPath) {
            try {
                const raw = (0, node_fs_1.readFileSync)(serviceAccountPath, 'utf8');
                const credentials = JSON.parse(raw);
                return (0, app_1.initializeApp)({
                    credential: (0, app_1.cert)(credentials),
                    projectId: projectId ?? credentials.project_id,
                });
            }
            catch (error) {
                throw new common_1.InternalServerErrorException(`Invalid FIREBASE_SERVICE_ACCOUNT_PATH: ${error instanceof Error ? error.message : 'unknown read/parse error'}`);
            }
        }
        if (!projectId) {
            throw new common_1.InternalServerErrorException('Firebase is not configured. Set FIREBASE_PROJECT_ID.');
        }
        if (!explicitAdcPath && !hasLocalAdc) {
            throw new common_1.InternalServerErrorException('Firebase credentials are not configured. Set FIREBASE_SERVICE_ACCOUNT_PATH (recommended), FIREBASE_SERVICE_ACCOUNT_JSON, or GOOGLE_APPLICATION_CREDENTIALS.');
        }
        if (explicitAdcPath && !(0, node_fs_1.existsSync)(explicitAdcPath)) {
            throw new common_1.InternalServerErrorException(`GOOGLE_APPLICATION_CREDENTIALS points to a missing file: ${explicitAdcPath}`);
        }
        return (0, app_1.initializeApp)({
            credential: (0, app_1.applicationDefault)(),
            projectId,
        });
    }
};
exports.FirestoreService = FirestoreService;
exports.FirestoreService = FirestoreService = FirestoreService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], FirestoreService);
