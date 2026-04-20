// In-memory session token — cleared on tab/window close
let _sessionToken = null;

// Shared refresh promise — prevents concurrent 401s from each triggering a separate refresh
let _refreshInProgress = null;

// Initialization promise — API calls wait for this before their own refresh
let _initPromise = null;

const ACCESS_TOKEN_KEY = "cinebook:accessToken";

export const tokenManager = {
  getSessionToken: () => _sessionToken,
  setSessionToken: (t) => { _sessionToken = t; },
  clearSessionToken: () => { _sessionToken = null; },

  getAccessToken: () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  setAccessToken: (t) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(ACCESS_TOKEN_KEY, t);
  },
  clearAccessToken: () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  },

  clearAll: () => {
    _sessionToken = null;
    _refreshInProgress = null;
    _initPromise = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  },

  // Deduplicate concurrent refresh calls — all callers wait on the same promise
  getOrStartRefresh: (refreshFn) => {
    if (!_refreshInProgress) {
      _refreshInProgress = refreshFn().finally(() => { _refreshInProgress = null; });
    }
    return _refreshInProgress;
  },

  // Called once when auth state fires — tracks the initialization promise
  setInitPromise: (p) => { _initPromise = p; },
  waitForInit: () => _initPromise ?? Promise.resolve()
};
