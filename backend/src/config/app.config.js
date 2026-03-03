"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appConfig = void 0;
exports.appConfig = {
    port: 3000,
    corsOrigin: process.env.CORS_ORIGIN ?? '*',
};
