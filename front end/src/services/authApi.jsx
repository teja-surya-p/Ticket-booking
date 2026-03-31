import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword
} from "firebase/auth";
import { APICallHandler, APICallError } from "./apiCallHandler";
import { API_ENDPOINTS } from "./constants";
import { firebaseApp } from "./firebaseConfig";

const firebaseAuth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

function getCurrentUser() {
  return firebaseAuth.currentUser;
}

async function syncProfileAfterSignIn(token, fallbackProfile) {
  try {
    const profile = await APICallHandler({
      url: API_ENDPOINTS.auth.syncVerification,
      method: "POST",
      operation: "Sync verification status",
      token
    });

    return {
      profile,
      syncWarning: ""
    };
  } catch (error) {
    return {
      profile: fallbackProfile,
      syncWarning: mapAuthErrorToMessage(error)
    };
  }
}

async function getCurrentUserIdToken(forceRefresh = false) {
  const user = getCurrentUser();

  if (!user) {
    throw new Error("No authenticated user found.");
  }

  return await user.getIdToken(forceRefresh);
}

export function mapAuthErrorToMessage(error) {
  const code = typeof error?.code === "string" ? error.code : "";
  const rawMessage = typeof error?.message === "string" ? error.message : "";

  switch (code) {
    case "auth/email-already-in-use":
      return "That email address is already in use. Try signing in instead.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/missing-email":
      return "Enter your email to receive a reset link.";
    case "auth/configuration-not-found":
      return "Firebase Authentication is not configured. In Firebase Console, open Authentication > Get started, enable Email/Password and Google, and add localhost to authorized domains.";
    case "auth/operation-not-allowed":
      return "This sign-in method is disabled. Enable Email/Password and Google in Firebase Console > Authentication > Sign-in method.";
    case "auth/invalid-api-key":
      return "Firebase API key is invalid for this app. Verify NEXT_PUBLIC_FIREBASE_* values in front end/.env.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized for Firebase Auth. Add localhost/127.0.0.1 in Firebase Console > Authentication > Settings > Authorized domains.";
    case "auth/weak-password":
      return "Choose a stronger password with at least 6 characters.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "Incorrect email or password.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email using a different sign-in method.";
    case "auth/network-request-failed":
      return "Network connection lost. Check your internet connection and try again.";
    case "auth/too-many-requests":
      return "Too many attempts were made. Please wait a bit and try again.";
    case "auth/popup-closed-by-user":
      return "Google sign-in popup was closed before completing sign-in.";
    case "auth/popup-blocked":
      return "Browser blocked the sign-in popup. Allow popups and try again.";
    case "auth/cancelled-popup-request":
      return "Another sign-in request is already in progress.";
    default:
      if (rawMessage.includes("CONFIGURATION_NOT_FOUND")) {
        return "Firebase Authentication is not configured. In Firebase Console, open Authentication > Get started, enable Email/Password and Google, and add localhost to authorized domains.";
      }

      if (error instanceof APICallError) {
        return error.message || "We could not complete registration right now.";
      }

      return error instanceof Error
        ? error.message
        : "We could not complete registration right now.";
  }
}

export async function registerCustomer(formData) {
  try {
    const credential = await createUserWithEmailAndPassword(
      firebaseAuth,
      String(formData?.email ?? "").trim(),
      String(formData?.password ?? "")
    );
    const user = credential.user;

    await sendEmailVerification(user);

    const token = await user.getIdToken();
    const profilePayload = {
      firstName: typeof formData?.firstName === "string" ? formData.firstName.trim() : "",
      lastName: typeof formData?.lastName === "string" ? formData.lastName.trim() : "",
      phone: typeof formData?.phone === "string" ? formData.phone.trim() : "",
      promotionsOptIn: Boolean(formData?.promotionsOptIn),
      address:
        formData?.address && typeof formData.address === "object" ? formData.address : null
    };
    const backendProfile = await APICallHandler({
      url: API_ENDPOINTS.auth.register,
      method: "POST",
      operation: "Register customer",
      token,
      body: profilePayload
    });

    return {
      ok: true,
      message: "Account created. Check your email to verify your account.",
      user: {
        uid: user.uid,
        email: user.email ?? "",
        emailVerified: Boolean(user.emailVerified)
      },
      profile: backendProfile
    };
  } catch (error) {
    return {
      ok: false,
      message: mapAuthErrorToMessage(error),
      code: typeof error?.code === "string" ? error.code : undefined,
      error
    };
  }
}

export async function resendVerificationEmail() {
  try {
    const user = getCurrentUser();

    if (!user) {
      throw new Error("No authenticated user found.");
    }

    await sendEmailVerification(user);

    return {
      ok: true,
      message: "Verification email sent."
    };
  } catch (error) {
    return {
      ok: false,
      message: mapAuthErrorToMessage(error),
      code: typeof error?.code === "string" ? error.code : undefined,
      error
    };
  }
}

export async function syncVerificationStatus() {
  try {
    const user = getCurrentUser();

    if (!user) {
      throw new Error("No authenticated user found.");
    }

    await reload(user);
    const token = await getCurrentUserIdToken(true);
    const profile = await APICallHandler({
      url: API_ENDPOINTS.auth.syncVerification,
      method: "POST",
      operation: "Sync verification status",
      token
    });

    return {
      ok: true,
      status: profile?.status ?? null,
      emailVerified: Boolean(profile?.emailVerified),
      profile
    };
  } catch (error) {
    return {
      ok: false,
      message: mapAuthErrorToMessage(error),
      code: typeof error?.code === "string" ? error.code : undefined,
      error
    };
  }
}

export async function sendPasswordResetLink(email) {
  try {
    const normalizedEmail = typeof email === "string" ? email.trim() : "";
    if (normalizedEmail.length === 0) {
      throw new Error("Enter your email to receive a reset link.");
    }

    await sendPasswordResetEmail(firebaseAuth, normalizedEmail);

    return {
      ok: true,
      message: "Password reset link sent. Please check your email."
    };
  } catch (error) {
    return {
      ok: false,
      message: mapAuthErrorToMessage(error),
      code: typeof error?.code === "string" ? error.code : undefined,
      error
    };
  }
}

export async function fetchCurrentUserProfile(forceRefreshToken = false) {
  try {
    const token = await getCurrentUserIdToken(forceRefreshToken);
    const profile = await APICallHandler({
      url: API_ENDPOINTS.auth.profile,
      method: "GET",
      operation: "Fetch current user profile",
      token
    });

    return {
      ok: true,
      profile
    };
  } catch (error) {
    return {
      ok: false,
      message: mapAuthErrorToMessage(error),
      code: typeof error?.code === "string" ? error.code : undefined,
      error
    };
  }
}

export async function updateCurrentUserProfile(payload, forceRefreshToken = false) {
  try {
    const token = await getCurrentUserIdToken(forceRefreshToken);
    const profile = await APICallHandler({
      url: API_ENDPOINTS.auth.profile,
      method: "PATCH",
      operation: "Update current user profile",
      token,
      body: payload
    });

    return {
      ok: true,
      profile
    };
  } catch (error) {
    return {
      ok: false,
      message: mapAuthErrorToMessage(error),
      code: typeof error?.code === "string" ? error.code : undefined,
      error
    };
  }
}

export function subscribeToAuthState(listener) {
  return onAuthStateChanged(firebaseAuth, listener);
}

export async function signInWithEmailPassword(credentials) {
  try {
    const credential = await firebaseSignInWithEmailAndPassword(
      firebaseAuth,
      String(credentials?.email ?? "").trim(),
      String(credentials?.password ?? "")
    );
    const user = credential.user;
    const token = await user.getIdToken(true);
    const fallbackProfile = {
      uid: user.uid,
      email: user.email ?? "",
      emailVerified: Boolean(user.emailVerified),
      status: user.emailVerified ? "Active" : "Inactive"
    };
    const { profile, syncWarning } = await syncProfileAfterSignIn(token, fallbackProfile);

    return {
      ok: true,
      user: {
        uid: user.uid,
        email: user.email ?? "",
        displayName: user.displayName ?? "",
        emailVerified: Boolean(user.emailVerified)
      },
      profile,
      syncWarning
    };
  } catch (error) {
    return {
      ok: false,
      message: mapAuthErrorToMessage(error),
      code: typeof error?.code === "string" ? error.code : undefined,
      error
    };
  }
}

export async function signInWithGoogle() {
  try {
    const credential = await signInWithPopup(firebaseAuth, googleProvider);
    const user = credential.user;
    const token = await user.getIdToken(true);
    const fallbackProfile = {
      uid: user.uid,
      email: user.email ?? "",
      emailVerified: Boolean(user.emailVerified),
      status: user.emailVerified ? "Active" : "Inactive"
    };
    const { profile, syncWarning } = await syncProfileAfterSignIn(token, fallbackProfile);

    return {
      ok: true,
      user: {
        uid: user.uid,
        email: user.email ?? "",
        displayName: user.displayName ?? "",
        emailVerified: Boolean(user.emailVerified)
      },
      profile,
      syncWarning
    };
  } catch (error) {
    return {
      ok: false,
      message: mapAuthErrorToMessage(error),
      code: typeof error?.code === "string" ? error.code : undefined,
      error
    };
  }
}

export async function signOutCurrentUser() {
  try {
    await signOut(firebaseAuth);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: mapAuthErrorToMessage(error),
      code: typeof error?.code === "string" ? error.code : undefined,
      error
    };
  }
}

export async function changeCurrentUserPassword(currentPassword, newPassword) {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error("No authenticated user found.");
    }

    const email = typeof user.email === "string" ? user.email.trim() : "";
    if (email.length === 0) {
      throw new Error("Current user email is unavailable.");
    }

    const currentPasswordValue =
      typeof currentPassword === "string" ? currentPassword : "";
    const newPasswordValue = typeof newPassword === "string" ? newPassword : "";

    if (currentPasswordValue.length === 0) {
      throw new Error("Current password is required.");
    }

    if (newPasswordValue.length < 6) {
      throw new Error("New password must be at least 6 characters.");
    }

    const credential = EmailAuthProvider.credential(email, currentPasswordValue);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPasswordValue);

    let notificationResult = null;
    try {
      const token = await user.getIdToken(true);
      notificationResult = await APICallHandler({
        url: API_ENDPOINTS.auth.passwordChanged,
        method: "POST",
        operation: "Notify password changed",
        token
      });
    } catch (error) {
      notificationResult = {
        notified: false,
        channel: "unknown",
        errorMessage: mapAuthErrorToMessage(error)
      };
    }

    const notified = Boolean(notificationResult?.notified);

    return {
      ok: true,
      message: notified
        ? "Password updated successfully. Confirmation email sent."
        : "Password updated successfully, but confirmation email could not be sent.",
      notification: notificationResult
    };
  } catch (error) {
    return {
      ok: false,
      message: mapAuthErrorToMessage(error),
      code: typeof error?.code === "string" ? error.code : undefined,
      error
    };
  }
}
