import jwt from "jsonwebtoken";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { appConfig } from "../config/app.config.js";
import { decorateClass } from "../common/nest-metadata.js";

class JwtService {
  signSessionToken(uid, email) {
    // Long-lived in-memory token — used to refresh the access token
    return jwt.sign(
      { uid, email, type: "session" },
      appConfig.sessionJwtSecret,
      { expiresIn: "8h" }
    );
  }

  signRefreshToken(uid, email) {
    // Stored in HttpOnly cookie — restores session token after tab close
    return jwt.sign(
      { uid, email, type: "refresh" },
      appConfig.refreshJwtSecret,
      { expiresIn: "7d" }
    );
  }

  signAccessToken(uid, email) {
    // Short-lived token sent with every API call
    return jwt.sign(
      { uid, email, type: "access" },
      appConfig.accessJwtSecret,
      { expiresIn: "30m" }
    );
  }

  verifySessionToken(token) {
    return this._verify(token, appConfig.sessionJwtSecret, "session");
  }

  verifyRefreshToken(token) {
    return this._verify(token, appConfig.refreshJwtSecret, "refresh");
  }

  verifyAccessToken(token) {
    return this._verify(token, appConfig.accessJwtSecret, "access");
  }

  _verify(token, secret, expectedType) {
    try {
      const payload = jwt.verify(token, secret);
      if (payload?.type !== expectedType) {
        throw new UnauthorizedException(`Invalid token type: expected ${expectedType}`);
      }
      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException(
        error instanceof Error ? error.message : "Invalid or expired token"
      );
    }
  }
}

decorateClass(JwtService, [Injectable()], []);

export { JwtService };
