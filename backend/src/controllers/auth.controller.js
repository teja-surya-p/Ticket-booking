import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Patch, Post, Req, Res } from "@nestjs/common";
import { decorateClass, decorateMethod, parameterDecorator } from "../common/nest-metadata.js";
import { AuthService } from "../services/auth.service.js";

class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  async register(authorization, body) {
    return await this.authService.register(authorization, body);
  }

  async syncVerification(authorization) {
    return await this.authService.syncVerification(authorization);
  }

  async getProfile(authorization) {
    return await this.authService.getProfile(authorization);
  }

  async updateProfile(authorization, body) {
    return await this.authService.updateProfile(authorization, body);
  }

  async notifyPasswordChanged(authorization) {
    return await this.authService.notifyPasswordChanged(authorization);
  }

  // ── Token-based auth ───────────────────────────────────────────────────────

  async login(authorization, res) {
    return await this.authService.login(authorization, res);
  }

  logout(res) {
    return this.authService.logout(res);
  }

  refreshSession(req) {
    return this.authService.refreshSession(req);
  }

  async refreshTokens(body, res) {
    return this.authService.refreshTokens(body, res);
  }

  refreshAccess(authorization) {
    return this.authService.refreshAccess(authorization);
  }
}

decorateMethod(
  AuthController.prototype,
  "register",
  [
    Post("register"),
    HttpCode(HttpStatus.OK),
    parameterDecorator(0, Headers("authorization")),
    parameterDecorator(1, Body())
  ],
  {
    paramTypes: [String, Object],
    returnType: Promise
  }
);

decorateMethod(
  AuthController.prototype,
  "syncVerification",
  [
    Post("sync-verification"),
    HttpCode(HttpStatus.OK),
    parameterDecorator(0, Headers("authorization"))
  ],
  {
    paramTypes: [String],
    returnType: Promise
  }
);

decorateMethod(
  AuthController.prototype,
  "getProfile",
  [Get("profile"), parameterDecorator(0, Headers("authorization"))],
  {
    paramTypes: [String],
    returnType: Promise
  }
);

decorateMethod(
  AuthController.prototype,
  "updateProfile",
  [
    Patch("profile"),
    HttpCode(HttpStatus.OK),
    parameterDecorator(0, Headers("authorization")),
    parameterDecorator(1, Body())
  ],
  {
    paramTypes: [String, Object],
    returnType: Promise
  }
);

decorateMethod(
  AuthController.prototype,
  "notifyPasswordChanged",
  [
    Post("password-changed"),
    HttpCode(HttpStatus.OK),
    parameterDecorator(0, Headers("authorization"))
  ],
  {
    paramTypes: [String],
    returnType: Promise
  }
);

// ── Token-based auth routes ────────────────────────────────────────────────

decorateMethod(
  AuthController.prototype,
  "login",
  [
    Post("login"),
    HttpCode(HttpStatus.OK),
    parameterDecorator(0, Headers("authorization")),
    parameterDecorator(1, Res({ passthrough: true }))
  ],
  { paramTypes: [String, Object], returnType: Promise }
);

decorateMethod(
  AuthController.prototype,
  "logout",
  [
    Post("logout"),
    HttpCode(HttpStatus.OK),
    parameterDecorator(0, Res({ passthrough: true }))
  ],
  { paramTypes: [Object], returnType: Object }
);

decorateMethod(
  AuthController.prototype,
  "refreshSession",
  [
    Post("refresh-session"),
    HttpCode(HttpStatus.OK),
    parameterDecorator(0, Req())
  ],
  { paramTypes: [Object], returnType: Object }
);

decorateMethod(
  AuthController.prototype,
  "refreshTokens",
  [
    Post("refresh-tokens"),
    HttpCode(HttpStatus.OK),
    parameterDecorator(0, Body()),
    parameterDecorator(1, Res({ passthrough: true }))
  ],
  { paramTypes: [Object, Object], returnType: Object }
);

decorateMethod(
  AuthController.prototype,
  "refreshAccess",
  [
    Post("refresh-access"),
    HttpCode(HttpStatus.OK),
    parameterDecorator(0, Headers("authorization"))
  ],
  { paramTypes: [String], returnType: Object }
);

decorateClass(AuthController, [Controller("auth")], [AuthService]);

export { AuthController };
