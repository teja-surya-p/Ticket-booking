import { APICallError } from "./apiCallHandler";
import "./apiErrorUtils.module.css";
const USER_FALLBACK_MESSAGE = "Something went wrong while processing your request. Please try again.";
const STATUS_MESSAGES = {
  400: "We could not process your request. Please check your input and try again.",
  401: "Your session is not authorized for this action.",
  403: "You do not have permission to perform this action.",
  404: "The requested data could not be found.",
  409: "This action conflicts with the latest data. Please refresh and try again.",
  422: "Some fields are invalid. Please review and submit again.",
  429: "Too many requests right now. Please wait a moment and try again.",
  500: "The server encountered an issue. Please try again shortly.",
  503: "The service is temporarily unavailable. Please try again shortly."
};
export function isAPICallError(error) {
  return error instanceof APICallError;
}
export function getMeaningfulErrorMessage(error, audience = "user") {
  if (!isAPICallError(error)) {
    return audience === "admin" ? `Unexpected client error: ${error instanceof Error ? error.message : "Unknown error"}` : USER_FALLBACK_MESSAGE;
  }
  if (audience === "admin") {
    const parts = [error.operation ? `Operation: ${error.operation}` : undefined, error.message ? `Message: ${error.message}` : undefined, error.status ? `Status: ${error.status}` : undefined, error.code ? `Code: ${error.code}` : undefined, error.method ? `Method: ${error.method}` : undefined, error.url ? `URL: ${error.url}` : undefined, error.requestId ? `Request ID: ${error.requestId}` : undefined, `Timestamp: ${error.timestamp}`].filter(Boolean);
    return parts.join(" | ");
  }
  if (error.status && STATUS_MESSAGES[error.status]) {
    return STATUS_MESSAGES[error.status];
  }
  return error.message || USER_FALLBACK_MESSAGE;
}
export function buildAdminIssueReport(error, context = {}) {
  const lines = [];
  const now = new Date().toISOString();
  lines.push("Issue Report");
  lines.push(`Generated At: ${now}`);
  if (isAPICallError(error)) {
    lines.push(`Operation: ${error.operation ?? "N/A"}`);
    lines.push(`Message: ${error.message}`);
    lines.push(`Status: ${error.status ?? "N/A"}`);
    lines.push(`Code: ${error.code ?? "N/A"}`);
    lines.push(`Method: ${error.method ?? "N/A"}`);
    lines.push(`URL: ${error.url ?? "N/A"}`);
    lines.push(`Request ID: ${error.requestId ?? "N/A"}`);
    lines.push(`Error Timestamp: ${error.timestamp}`);
    if (error.details !== undefined) {
      lines.push(`Details: ${safeStringify(error.details)}`);
    }
  } else {
    lines.push(`Error: ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`);
  }
  if (Object.keys(context).length > 0) {
    lines.push(`Context: ${safeStringify(context)}`);
  }
  return lines.join("\n");
}
function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
