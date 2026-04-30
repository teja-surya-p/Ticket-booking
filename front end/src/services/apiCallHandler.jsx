import { API_BASE_URL } from "./constants";
import { tokenManager } from "./tokenManager";
import "./apiCallHandler.module.css";
export const getBaseURL = () => API_BASE_URL;
export class APICallError extends Error {
  constructor(message, status, code, meta = {}) {
    super(message);
    this.name = "APICallError";
    this.status = status;
    this.code = code;
    this.url = meta.url;
    this.method = meta.method;
    this.operation = meta.operation;
    this.requestId = meta.requestId;
    this.details = meta.details;
    this.timestamp = new Date().toISOString();
  }
}
const isAbsoluteUrl = value => /^https?:\/\//i.test(value);
const extractRequestId = headers => {
  return headers.get("x-request-id") ?? headers.get("x-correlation-id") ?? headers.get("x-trace-id") ?? undefined;
};
const extractErrorMessage = (data, fallback) => {
  if (typeof data === "object" && data !== null) {
    if ("message" in data && typeof data.message === "string") {
      return data.message;
    }
    if ("error" in data && typeof data.error === "string") {
      return data.error;
    }
  }
  return fallback;
};
const extractErrorCode = data => {
  if (typeof data === "object" && data !== null && "code" in data && typeof data.code === "string") {
    return data.code;
  }
  return undefined;
};
const extractErrorDetails = data => {
  if (typeof data === "object" && data !== null && "details" in data) {
    return data.details;
  }
  return data;
};
const buildRequestUrl = (url, query) => {
  const base = getBaseURL();
  const normalizedPath = url.startsWith("/") ? url : `/${url}`;
  const absoluteUrl = isAbsoluteUrl(url) ? url : base ? `${base.replace(/\/$/, "")}${normalizedPath}` : normalizedPath;
  const parsedUrl = absoluteUrl.startsWith("/") ? new URL(absoluteUrl, "http://localhost") : new URL(absoluteUrl);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).length > 0) {
        parsedUrl.searchParams.set(key, String(value));
      }
    });
  }
  if (isAbsoluteUrl(absoluteUrl)) {
    return parsedUrl.toString();
  }
  return `${parsedUrl.pathname}${parsedUrl.search}`;
};
export const APICallHandler = async options => {
  const {
    url,
    method,
    operation,
    header,
    body,
    query,
    token,
    credentials = "include",
    allowEmptyResponse = false,
    _isRetry = false
  } = options;
  // Use explicit token first, then fall back to access token from localStorage
  const resolvedToken = token ?? tokenManager.getAccessToken();
  const headers = {
    "Content-Type": "application/json",
    ...(resolvedToken ? {
      Authorization: `Bearer ${resolvedToken}`
    } : {}),
    ...(header ?? {})
  };
  try {
    const requestUrl = buildRequestUrl(url, query);
    const response = await fetch(requestUrl, {
      method,
      headers,
      credentials,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });

    // Auto-refresh on 401 (access token expired).
    // _isRetry prevents recursive loops — refresh calls themselves must NOT retry.
    if (response.status === 401 && !_isRetry) {
      try {
        // Lazy import to avoid circular dependency at module load time
        const { refreshAccessToken, forceLogout } = await import("./authApi");

        // If initialization is still in progress (page load), wait for it —
        // the access token may already be set by the time it finishes.
        await tokenManager.waitForInit();

        // If init gave us a fresh access token, just retry without refreshing.
        if (tokenManager.getAccessToken()) {
          return APICallHandler({ ...options, _isRetry: true });
        }

        // Deduplicate: all concurrent 401s share one refresh attempt.
        await tokenManager.getOrStartRefresh(() => refreshAccessToken());

        return APICallHandler({ ...options, _isRetry: true });
      } catch {
        // Session token expired or missing — force logout.
        const { forceLogout } = await import("./authApi");
        forceLogout();
      }
    }
    if (response.status === 204) {
      return undefined;
    }
    const responseText = await response.text().catch(() => "");
    let data = null;
    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch {
        data = responseText;
      }
    }
    if (!response.ok) {
      const errorMessage = extractErrorMessage(data, `HTTP Error: ${response.status} ${response.statusText}`);
      const errorCode = extractErrorCode(data);
      const requestId = extractRequestId(response.headers);
      throw new APICallError(errorMessage, response.status, errorCode, {
        url: requestUrl,
        method,
        operation,
        requestId,
        details: extractErrorDetails(data)
      });
    }
    if ((data === null || data === undefined || data === "") && !allowEmptyResponse) {
      throw new APICallError("No data received from server", response.status, undefined, {
        url: requestUrl,
        method,
        operation
      });
    }
    return data;
  } catch (error) {
    if (error instanceof APICallError) {
      throw error;
    }
    const fallbackMessage = error instanceof TypeError ? "Unable to reach the server. Please check your internet connection." : error instanceof Error ? error.message : "An unknown error occurred";
    throw new APICallError(fallbackMessage, undefined, "CLIENT_REQUEST_FAILED", {
      url: buildRequestUrl(url, query),
      method,
      operation,
      details: error instanceof Error ? error.stack : error
    });
  }
};
