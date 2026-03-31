import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Patch, Post } from "@nestjs/common";
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

decorateClass(AuthController, [Controller("auth")], [AuthService]);

export { AuthController };
