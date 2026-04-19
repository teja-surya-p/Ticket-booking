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
    const pass = typeof process.env.SMTP_PASS === "string" ? process.env.SMTP_PASS.replace(/\s/g, "") : "";
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

  /**
   * Sends a booking confirmation email to the customer.
   * @param {object} params
   * @param {string} params.toEmail
   * @param {string} params.customerName
   * @param {string} params.bookingId
   * @param {string} params.movieTitle
   * @param {string} params.showtime   - ISO timestamp
   * @param {string} params.hallName
   * @param {string[]} params.seatIds
   * @param {{ adult: number, child: number, senior: number }} params.tickets
   * @param {number} params.total
   * @param {{ brand: string, last4: string }} params.paymentCard
   * @param {string|null} params.promoCode
   * @param {number} params.discountPercent
   */
  async sendBookingConfirmationEmail({
    toEmail,
    customerName,
    bookingId,
    movieTitle,
    showtime,
    hallName,
    seatIds,
    tickets,
    total,
    paymentCard,
    promoCode,
    discountPercent
  }) {
    if (typeof toEmail !== "string" || toEmail.trim().length === 0) {
      return { sent: false, reason: "missing-recipient" };
    }

    const name = this.sanitizeHeaderText(customerName, "there");
    const safeMovie = this.sanitizeHeaderText(movieTitle, "your movie");
    const safeBookingId = this.sanitizeHeaderText(bookingId, "N/A");
    const safeHall = this.sanitizeHeaderText(hallName, "N/A");

    const showtimeDate = new Date(showtime);
    const dateStr = isNaN(showtimeDate.getTime())
      ? showtime
      : showtimeDate.toLocaleDateString("en-US", {
          weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC"
        });
    const timeStr = isNaN(showtimeDate.getTime())
      ? ""
      : showtimeDate.toLocaleTimeString("en-US", {
          hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC"
        });
    const showtimeLabel = timeStr ? `${dateStr} at ${timeStr}` : dateStr;

    const adult = Number(tickets?.adult ?? 0);
    const child = Number(tickets?.child ?? 0);
    const senior = Number(tickets?.senior ?? 0);
    const ticketLines = [];
    if (adult > 0) ticketLines.push(`Adult × ${adult}`);
    if (child > 0) ticketLines.push(`Child × ${child}`);
    if (senior > 0) ticketLines.push(`Senior × ${senior}`);

    const seatsLabel = Array.isArray(seatIds) && seatIds.length > 0
      ? seatIds.join(", ")
      : "N/A";
    const cardLabel = paymentCard
      ? `${paymentCard.brand} ending in ${paymentCard.last4}`
      : "N/A";
    const promoLine = promoCode
      ? `Promo code: ${promoCode} (${discountPercent}% off)`
      : null;

    // Plain text
    const textLines = [
      `Hi ${name},`,
      "",
      "Your booking is confirmed! Here are your details:",
      "",
      `Booking ID   : ${safeBookingId}`,
      `Movie        : ${safeMovie}`,
      `Showtime     : ${showtimeLabel}`,
      `Hall         : ${safeHall}`,
      `Seats        : ${seatsLabel}`,
      `Tickets      : ${ticketLines.join(", ")}`,
      ...(promoLine ? [`Promo        : ${promoLine}`] : []),
      `Total Paid   : $${Number(total).toFixed(2)}`,
      `Payment      : ${cardLabel}`,
      "",
      "Enjoy the show! Please arrive at least 15 minutes before the showtime.",
      "",
      "— The CineBook Team"
    ];

    // HTML
    const ticketRows = ticketLines
      .map((line) => `<tr><td colspan="2" style="padding:0.2rem 0;color:#374151">${line}</td></tr>`)
      .join("");

    const promoRow = promoLine
      ? `<tr><td style="padding:0.25rem 0.5rem 0.25rem 0;color:#6b7280;white-space:nowrap">Promo</td><td style="padding:0.25rem 0;color:#374151">${promoLine}</td></tr>`
      : "";

    const html = [
      `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:1.5rem;background:#ffffff">`,
      `<h2 style="color:#111827;margin-bottom:0.25rem">Booking Confirmed!</h2>`,
      `<p style="color:#6b7280;margin-top:0">Hi ${name}, your ticket is locked in.</p>`,
      `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:0.5rem;padding:1.25rem;margin:1.25rem 0">`,
      `<table style="width:100%;border-collapse:collapse">`,
      `<tr><td style="padding:0.25rem 0.5rem 0.25rem 0;color:#6b7280;white-space:nowrap;vertical-align:top">Booking ID</td><td style="padding:0.25rem 0;color:#111827;font-weight:600;font-family:monospace">${safeBookingId}</td></tr>`,
      `<tr><td style="padding:0.25rem 0.5rem 0.25rem 0;color:#6b7280;white-space:nowrap">Movie</td><td style="padding:0.25rem 0;color:#111827;font-weight:600">${safeMovie}</td></tr>`,
      `<tr><td style="padding:0.25rem 0.5rem 0.25rem 0;color:#6b7280;white-space:nowrap">Showtime</td><td style="padding:0.25rem 0;color:#374151">${showtimeLabel}</td></tr>`,
      `<tr><td style="padding:0.25rem 0.5rem 0.25rem 0;color:#6b7280;white-space:nowrap">Hall</td><td style="padding:0.25rem 0;color:#374151">${safeHall}</td></tr>`,
      `<tr><td style="padding:0.25rem 0.5rem 0.25rem 0;color:#6b7280;white-space:nowrap;vertical-align:top">Seats</td><td style="padding:0.25rem 0;color:#374151">${seatsLabel}</td></tr>`,
      `<tr><td style="padding:0.25rem 0.5rem 0.25rem 0;color:#6b7280;white-space:nowrap;vertical-align:top">Tickets</td><td style="padding:0.25rem 0"><table style="border-collapse:collapse">${ticketRows}</table></td></tr>`,
      promoRow,
      `<tr style="border-top:1px solid #e5e7eb"><td style="padding:0.5rem 0.5rem 0.25rem 0;color:#6b7280;white-space:nowrap;font-weight:600">Total Paid</td><td style="padding:0.5rem 0 0.25rem;color:#111827;font-weight:700;font-size:1.1rem">$${Number(total).toFixed(2)}</td></tr>`,
      `<tr><td style="padding:0.25rem 0.5rem 0.25rem 0;color:#6b7280;white-space:nowrap">Payment</td><td style="padding:0.25rem 0;color:#374151">${cardLabel}</td></tr>`,
      `</table>`,
      `</div>`,
      `<p style="color:#374151">Enjoy the show! Please arrive at least 15 minutes before the showtime.</p>`,
      `<p style="color:#9ca3af;font-size:0.8rem;margin-top:1.5rem">— The CineBook Team</p>`,
      `</div>`
    ].join("");

    return await this.dispatchEmailMessage(
      { toEmail: toEmail.trim(), subject: `Booking Confirmed — ${safeMovie}`, text: textLines.join("\n"), html },
      "booking-confirmation"
    );
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
