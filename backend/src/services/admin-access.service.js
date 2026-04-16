import { Injectable, UnauthorizedException } from "@nestjs/common";
import { decorateClass } from "../common/nest-metadata.js";

const DEFAULT_ADMIN_EMAIL = "admin@gmail.com";
const DEFAULT_ADMIN_PASSWORD = "admin";

class AdminAccessService {
  requireAdminAccess(adminEmail, adminPassword) {
    const providedEmail = this.normalizeOptionalString(adminEmail).toLowerCase();
    const providedPassword = this.normalizeOptionalString(adminPassword);
    const expectedEmail = this.resolveConfiguredAdminEmail();
    const expectedPassword = this.resolveConfiguredAdminPassword();

    if (!providedEmail || !providedPassword) {
      throw new UnauthorizedException("Missing admin authentication headers");
    }

    if (providedEmail !== expectedEmail || providedPassword !== expectedPassword) {
      throw new UnauthorizedException("Invalid admin credentials");
    }

    return {
      email: expectedEmail,
      mode: "local-admin"
    };
  }

  resolveConfiguredAdminEmail() {
    return this.normalizeOptionalString(process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL).toLowerCase();
  }

  resolveConfiguredAdminPassword() {
    return process.env.ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;
  }

  normalizeOptionalString(value) {
    return typeof value === "string" ? value.trim() : "";
  }
}

decorateClass(AdminAccessService, [Injectable()]);

export { AdminAccessService };
