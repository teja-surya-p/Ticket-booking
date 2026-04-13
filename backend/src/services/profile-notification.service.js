import { Injectable } from "@nestjs/common";
import nodemailer from "nodemailer";
import { decorateClass } from "../common/nest-metadata.js";
import { FirestoreService } from "../config/firestore.service.js";

class ProfileNotificationService {
  constructor(firestoreService) {
    this.firestoreService = firestoreService;
    this.mailer = null;
  }

  resolveDeliveryMode() {
    const mode =
      typeof process.env.PROFILE_EMAIL_DELIVERY === "string"
        ? process.env.PROFILE_EMAIL_DELIVERY.trim().toLowerCase()
        : "smtp";

    return mode === "firebase" || mode === "both" ? mode : "smtp";
  }

  resolveFirebaseMailCollection() {
    const collection =
      typeof process.env.FIREBASE_EMAIL_COLLECTION === "string"
        ? process.env.FIREBASE_EMAIL_COLLECTION.trim()
        : "";

    return collection.length > 0 ? collection : "mail";
  }

  resolveFromAddress() {
    return typeof process.env.SMTP_FROM === "string" ? process.env.SMTP_FROM.trim() : "";
  }

  resolveTransportOptions() {
    const service =
      typeof process.env.SMTP_SERVICE === "string" ? process.env.SMTP_SERVICE.trim() : "";
    const host = typeof process.env.SMTP_HOST === "string" ? process.env.SMTP_HOST.trim() : "";
    const user = typeof process.env.SMTP_USER === "string" ? process.env.SMTP_USER.trim() : "";
    const pass = typeof process.env.SMTP_PASS === "string" ? process.env.SMTP_PASS : "";
    const portValue =
      typeof process.env.SMTP_PORT === "string" ? process.env.SMTP_PORT.trim() : "";
    const parsedPort = Number(portValue);
    const secure = String(process.env.SMTP_SECURE ?? "false").toLowerCase() === "true";

    if (!user || !pass) {
      return null;
    }

    if (service) {
      return {
        service,
        auth: {
          user,
          pass
        }
      };
    }

    if (!host) {
      return null;
    }

    return {
      host,
      port: Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 587,
      secure,
      auth: {
        user,
        pass
      }
    };
  }

  getMailer() {
    if (this.mailer) {
      return this.mailer;
    }

    const transportOptions = this.resolveTransportOptions();
    if (!transportOptions) {
      return null;
    }

    this.mailer = nodemailer.createTransport(transportOptions);
    return this.mailer;
  }

  sanitizeHeaderText(value, fallback = "Not provided") {
    if (typeof value !== "string") {
      return fallback;
    }

    const normalized = value.replace(/\s+/g, " ").trim();
    return normalized.length > 0 ? normalized : fallback;
  }

  async sendProfileUpdatedEmail({ toEmail, displayName, changes, updatedAt }) {
    if (typeof toEmail !== "string" || toEmail.trim().length === 0) {
      return {
        sent: false,
        reason: "missing-recipient"
      };
    }

    if (!Array.isArray(changes) || changes.length === 0) {
      return {
        sent: false,
        reason: "no-changes"
      };
    }

    const name = this.sanitizeHeaderText(displayName, "there");
    const safeChanges = changes.map((item) => ({
      label: this.sanitizeHeaderText(item?.label, "Field"),
      before: this.sanitizeHeaderText(item?.before),
      after: this.sanitizeHeaderText(item?.after)
    }));

    const textLines = [
      `Hi ${name},`,
      "",
      "Your profile was updated in CineBook with the following changes:",
      "",
      ...safeChanges.map((item) => `- ${item.label}: ${item.before} -> ${item.after}`),
      "",
      `Updated at: ${this.sanitizeHeaderText(updatedAt, new Date().toISOString())}`,
      "",
      "If this was not you, please secure your account immediately."
    ];

    const htmlChanges = safeChanges
      .map(
        (item) =>
          `<li><strong>${item.label}</strong>: <span>${item.before}</span> &rarr; <span>${item.after}</span></li>`
      )
      .join("");

    const html = [
      `<p>Hi ${name},</p>`,
      "<p>Your profile was updated in CineBook with the following changes:</p>",
      `<ul>${htmlChanges}</ul>`,
      `<p><strong>Updated at:</strong> ${this.sanitizeHeaderText(
        updatedAt,
        new Date().toISOString()
      )}</p>`,
      "<p>If this was not you, please secure your account immediately.</p>"
    ].join("");

    const message = {
      toEmail: toEmail.trim(),
      subject: "Your CineBook profile was updated",
      text: textLines.join("\n"),
      html
    };
    return await this.dispatchEmailMessage(message, "profile-updated");
  }

  async sendPasswordChangedEmail({ toEmail, displayName, changedAt }) {
    if (typeof toEmail !== "string" || toEmail.trim().length === 0) {
      return {
        sent: false,
        reason: "missing-recipient"
      };
    }

    const name = this.sanitizeHeaderText(displayName, "there");
    const safeChangedAt = this.sanitizeHeaderText(changedAt, new Date().toISOString());
    const message = {
      toEmail: toEmail.trim(),
      subject: "Your CineBook password was changed",
      text: [
        `Hi ${name},`,
        "",
        "This is a confirmation that your CineBook account password was changed.",
        `Changed at: ${safeChangedAt}`,
        "",
        "If this was not you, reset your password immediately and review account activity."
      ].join("\n"),
      html: [
        `<p>Hi ${name},</p>`,
        "<p>This is a confirmation that your CineBook account password was changed.</p>",
        `<p><strong>Changed at:</strong> ${safeChangedAt}</p>`,
        "<p>If this was not you, reset your password immediately and review account activity.</p>"
      ].join("")
    };

    return await this.dispatchEmailMessage(message, "password-changed");
  }

  async sendPromotionEmail(toEmail, displayName, promotion) {
    if (typeof toEmail !== "string" || toEmail.trim().length === 0) {
      return { sent: false, reason: "missing-recipient" };
    }

    const name = this.sanitizeHeaderText(displayName, "Valued Customer");
    const safeTitle = this.sanitizeHeaderText(promotion?.title, "Special Offer");
    const safeMessage = this.sanitizeHeaderText(promotion?.message, "");
    const safeShowroom = this.sanitizeHeaderText(promotion?.showroomName, "our showroom");

    const message = {
      toEmail: toEmail.trim(),
      subject: `CineBook Promotion: ${safeTitle}`,
      text: [
        `Hi ${name},`,
        "",
        `We have an exciting promotion for you at ${safeShowroom}!`,
        "",
        safeTitle,
        "",
        safeMessage,
        "",
        "Visit CineBook to book your tickets today."
      ].join("\n"),
      html: [
        `<p>Hi ${name},</p>`,
        `<p>We have an exciting promotion for you at <strong>${safeShowroom}</strong>!</p>`,
        `<h2 style="margin:1rem 0 0.5rem">${safeTitle}</h2>`,
        `<p>${safeMessage}</p>`,
        "<p>Visit CineBook to book your tickets today.</p>"
      ].join("")
    };

    return await this.dispatchEmailMessage(message, "promotion");
  }

  async dispatchEmailMessage(message, category = "notification") {
    const deliveryMode = this.resolveDeliveryMode();

    if (deliveryMode === "firebase") {
      await this.enqueueFirebaseEmail(message, category);
      return {
        sent: true,
        channel: "firebase"
      };
    }

    if (deliveryMode === "smtp") {
      const sent = await this.sendViaSmtp(message);
      return {
        sent,
        channel: "smtp"
      };
    }

    let firebaseSuccess = false;
    let smtpSuccess = false;

    try {
      await this.enqueueFirebaseEmail(message, category);
      firebaseSuccess = true;
    } catch (error) {
      console.error(
        "[ProfileNotificationService] Firebase mail queue write failed:",
        error instanceof Error ? error.message : error
      );
    }

    try {
      smtpSuccess = await this.sendViaSmtp(message);
    } catch (error) {
      console.error(
        "[ProfileNotificationService] SMTP send failed:",
        error instanceof Error ? error.message : error
      );
    }

    return {
      sent: firebaseSuccess || smtpSuccess,
      channel: firebaseSuccess && smtpSuccess ? "both" : firebaseSuccess ? "firebase" : "smtp"
    };
  }

  async enqueueFirebaseEmail({ toEmail, subject, text, html }, category = "notification") {
    const payload = {
      to: [toEmail],
      message: {
        subject,
        text,
        html
      },
      metadata: {
        category,
        createdAt: new Date().toISOString()
      }
    };

    const fromAddress = this.resolveFromAddress();
    if (fromAddress) {
      payload.from = fromAddress;
    }

    await this.firestoreService
      .db()
      .collection(this.resolveFirebaseMailCollection())
      .add(payload);
  }

  async sendViaSmtp({ toEmail, subject, text, html }) {
    const fromAddress = this.resolveFromAddress();
    const mailer = this.getMailer();

    if (!fromAddress || !mailer) {
      console.warn(
        "[ProfileNotificationService] SMTP is not fully configured. Skipping SMTP send."
      );
      return false;
    }

    await mailer.sendMail({
      from: fromAddress,
      to: toEmail,
      subject,
      text,
      html
    });

    return true;
  }
}

decorateClass(ProfileNotificationService, [Injectable()], [FirestoreService]);

export { ProfileNotificationService };
