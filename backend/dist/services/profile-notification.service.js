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
    const promoCode = typeof promotion?.promoCode === "string" && promotion.promoCode.trim().length > 0
      ? promotion.promoCode.trim()
      : null;
    const discountPercent = promoCode && promotion?.discountPercent ? promotion.discountPercent : null;

    const promoCodeTextLines = promoCode
      ? [
          "",
          "--- EXCLUSIVE PROMO CODE ---",
          `Use code: ${promoCode}`,
          `Discount: ${discountPercent}% off your booking`,
          "This code is for one-time use per account.",
          "----------------------------"
        ]
      : [];

    const promoCodeHtml = promoCode
      ? `<div style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:0.5rem;padding:1rem;margin:1rem 0;text-align:center">
           <p style="font-weight:600;font-size:1rem;margin:0 0 0.5rem">Your Exclusive Promo Code</p>
           <p style="font-size:1.5rem;font-weight:700;letter-spacing:0.1em;color:#2563eb;margin:0.5rem 0">${promoCode}</p>
           <p style="margin:0.25rem 0;color:#374151">${discountPercent}% off your booking</p>
           <p style="font-size:0.75rem;color:#6b7280;margin:0.5rem 0 0">One-time use per account</p>
         </div>`
      : "";

    const message = {
      toEmail: toEmail.trim(),
      subject: `CineBook Promotion: ${safeTitle}`,
      text: [
        `Hi ${name},`,
        "",
        "You have an exclusive promotion from CineBook!",
        "",
        safeTitle,
        "",
        safeMessage,
        ...promoCodeTextLines,
        "",
        "Visit CineBook to book your tickets today."
      ].join("\n"),
      html: [
        `<p>Hi ${name},</p>`,
        "<p>You have an exclusive promotion from CineBook!</p>",
        `<h2 style="margin:1rem 0 0.5rem">${safeTitle}</h2>`,
        `<p>${safeMessage}</p>`,
        promoCodeHtml,
        "<p>Visit CineBook to book your tickets today.</p>"
      ].join("")
    };

    return await this.dispatchEmailMessage(message, "promotion");
  }

  /**
   * Sends a "showtimes now available" notification email to a subscriber.
   * @param {string} toEmail
   * @param {string} displayName
   * @param {string} movieTitle
   * @param {Array<{startAt: string, showroomName: string}>} showtimes - sorted ascending by startAt
   */
  async sendShowtimeNotificationEmail(toEmail, displayName, movieTitle, showtimes) {
    if (typeof toEmail !== "string" || toEmail.trim().length === 0) {
      return { sent: false, reason: "missing-recipient" };
    }

    const name = this.sanitizeHeaderText(displayName, "Valued Customer");
    const safeTitle = this.sanitizeHeaderText(movieTitle, "the movie");

    // Group showtimes by date
    const byDate = {};
    for (const st of showtimes) {
      const dateKey = st.startAt.slice(0, 10); // "YYYY-MM-DD"
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push(st);
    }

    const dateEntries = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b));

    // Plain-text version
    const textLines = [
      `Hi ${name},`,
      "",
      `Great news! Showtimes for "${safeTitle}" are now available.`,
      "",
      "Available showtimes:"
    ];
    for (const [dateKey, slots] of dateEntries) {
      const displayDate = new Date(dateKey + "T00:00:00Z").toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC"
      });
      textLines.push("", displayDate);
      for (const slot of slots) {
        const time = new Date(slot.startAt).toLocaleTimeString("en-US", {
          hour: "numeric", minute: "2-digit", hour12: true
        });
        textLines.push(`  ${time} — ${slot.showroomName}`);
      }
    }
    textLines.push("", "Visit CineBook to book your tickets now!");

    // HTML version
    let slotRowsHtml = "";
    for (const [dateKey, slots] of dateEntries) {
      const displayDate = new Date(dateKey + "T00:00:00Z").toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC"
      });
      slotRowsHtml += `<div style="margin-bottom:1rem">
        <p style="font-weight:700;font-size:1rem;color:#111827;margin:0 0 0.4rem">${displayDate}</p>
        <div style="display:flex;flex-wrap:wrap;gap:0.5rem">`;
      for (const slot of slots) {
        const time = new Date(slot.startAt).toLocaleTimeString("en-US", {
          hour: "numeric", minute: "2-digit", hour12: true
        });
        slotRowsHtml += `<span style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:0.375rem;padding:0.3rem 0.75rem;font-size:0.875rem;color:#374151">
          ${time} &mdash; ${slot.showroomName}
        </span>`;
      }
      slotRowsHtml += `</div></div>`;
    }

    const message = {
      toEmail: toEmail.trim(),
      subject: `Showtimes now available: "${safeTitle}"`,
      text: textLines.join("\n"),
      html: [
        `<p>Hi ${name},</p>`,
        `<p>Great news! Showtimes for <strong>${safeTitle}</strong> are now available.</p>`,
        `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:0.5rem;padding:1.25rem;margin:1rem 0">`,
        `<p style="font-weight:600;margin:0 0 1rem">Available Showtimes</p>`,
        slotRowsHtml,
        `</div>`,
        `<p>Visit CineBook to book your tickets now!</p>`
      ].join("")
    };

    return await this.dispatchEmailMessage(message, "showtime-notification");
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
