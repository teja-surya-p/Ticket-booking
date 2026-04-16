const ADMIN_MODE_STORAGE_KEY = "cinebook:admin";
const LOCAL_ADMIN_EMAIL = "admin@gmail.com";
const LOCAL_ADMIN_PASSWORD = "admin";

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function setAdminMode(enabled) {
  if (!canUseStorage()) {
    return;
  }

  if (enabled) {
    window.localStorage.setItem(ADMIN_MODE_STORAGE_KEY, "true");
    return;
  }

  window.localStorage.removeItem(ADMIN_MODE_STORAGE_KEY);
}

export function clearAdminMode() {
  setAdminMode(false);
}

export function isAdminModeEnabled() {
  if (!canUseStorage()) {
    return false;
  }

  return window.localStorage.getItem(ADMIN_MODE_STORAGE_KEY) === "true";
}

export function getAdminAuthHeaders() {
  if (!isAdminModeEnabled()) {
    return {};
  }

  return {
    "x-admin-email": LOCAL_ADMIN_EMAIL,
    "x-admin-password": LOCAL_ADMIN_PASSWORD
  };
}

export {
  ADMIN_MODE_STORAGE_KEY,
  LOCAL_ADMIN_EMAIL,
  LOCAL_ADMIN_PASSWORD
};
