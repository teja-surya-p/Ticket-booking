import { Injectable, Logger } from "@nestjs/common";
import { appConfig } from "../config/app.config.js";
import { decorateClass } from "../common/nest-metadata.js";

/**
 * GeminiAdapter
 *
 * Adapter Pattern: thin wrapper around Google Gemini's REST API. Exposes a
 * provider-neutral `rankCandidates(preferences, candidates)` method so the
 * recommendation strategy never imports an SDK or knows the request shape.
 * Swap this class for an OpenAI/Anthropic adapter without touching the
 * recommendation business logic.
 *
 * Security:
 *   - The API key is read from process.env on the server only and never
 *     exposed to the frontend.
 *   - We send only a compact preference summary plus a shortlist of candidate
 *     movies — never the full database.
 */
class GeminiAdapter {
  constructor() {
    this.logger = new Logger(GeminiAdapter.name);
  }

  isConfigured() {
    return typeof appConfig.geminiApiKey === "string" && appConfig.geminiApiKey.trim().length > 0;
  }

  /**
   * Asks Gemini to rank candidate movies given a user preference summary.
   *
   * @param {object} preferences - compact preference signal (genres, titles, cast, directors)
   * @param {object[]} candidates - shortlisted movies to rank: { id, title, genres, cast, director, description }
   * @param {number} max - maximum number of recommendations to return
   * @returns {Promise<Array<{ movieId: number, rank: number, reason: string }>>}
   */
  async rankCandidates(preferences, candidates, max) {
    if (!this.isConfigured()) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return [];
    }

    const prompt = this.buildPrompt(preferences, candidates, max);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      appConfig.geminiModel
    )}:generateContent?key=${encodeURIComponent(appConfig.geminiApiKey)}`;

    const requestBody = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json"
      }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Gemini API ${response.status}: ${errorText.slice(0, 200)}`);
    }

    const data = await response.json();
    const rawText = this.extractText(data);
    if (!rawText) {
      throw new Error("Gemini response contained no text");
    }

    const parsed = this.parseJsonArray(rawText);
    return this.normalizeRankings(parsed, candidates, max);
  }

  buildPrompt(preferences, candidates, max) {
    const safeMax = Math.max(1, Math.min(20, Number(max) || 5));
    const targetCount = Math.min(safeMax, candidates.length);
    return [
      "You are a film recommendation engine for a cinema booking app.",
      "Rank the candidate list ONLY — do NOT invent movies, only return ids from the candidates.",
      "Even if some candidates seem like a weaker match, still rank them — return the FULL number requested.",
      "If a candidate already appears in the user's favourite titles, still recommend it (the user clearly enjoys it).",
      "",
      "USER PREFERENCES:",
      JSON.stringify(preferences),
      "",
      "CANDIDATE MOVIES:",
      JSON.stringify(candidates),
      "",
      `Return a JSON array (no prose, no markdown) of EXACTLY ${targetCount} items, each shaped:`,
      `{"movieId": number, "rank": number, "reason": "one short sentence (max 160 chars) explaining why this user will like it"}`,
      "Order the array by rank ascending (best first, rank starts at 1)."
    ].join("\n");
  }

  extractText(data) {
    const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
    for (const candidate of candidates) {
      const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
      for (const part of parts) {
        if (typeof part?.text === "string" && part.text.trim().length > 0) {
          return part.text.trim();
        }
      }
    }
    return "";
  }

  parseJsonArray(text) {
    // Try strict parse first.
    try {
      const value = JSON.parse(text);
      if (Array.isArray(value)) return value;
      if (Array.isArray(value?.recommendations)) return value.recommendations;
    } catch {
      // fall through to a tolerant extract
    }

    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        const value = JSON.parse(text.slice(start, end + 1));
        if (Array.isArray(value)) return value;
      } catch {
        return [];
      }
    }
    return [];
  }

  normalizeRankings(rawItems, candidates, max) {
    const candidateIds = new Set(candidates.map((m) => Number(m.id)).filter(Number.isInteger));
    const seen = new Set();
    const safeMax = Math.max(1, Math.min(20, Number(max) || 5));

    const items = [];
    for (const item of Array.isArray(rawItems) ? rawItems : []) {
      const movieId = Number(item?.movieId ?? item?.id);
      if (!Number.isInteger(movieId) || !candidateIds.has(movieId) || seen.has(movieId)) {
        continue;
      }

      const rank = Number.isFinite(Number(item?.rank)) ? Number(item.rank) : items.length + 1;
      const rawReason = typeof item?.reason === "string" ? item.reason.trim() : "";
      const reason = rawReason.length > 0 ? rawReason.slice(0, 200) : "";

      seen.add(movieId);
      items.push({ movieId, rank, reason });

      if (items.length >= safeMax) break;
    }

    items.sort((a, b) => a.rank - b.rank);
    return items.map((item, index) => ({ ...item, rank: index + 1 }));
  }
}

decorateClass(GeminiAdapter, [Injectable()], []);

export { GeminiAdapter };
