import {
  createUserWithEmailAndPassword,
  getAuth,
  reload,
  sendEmailVerification
} from "firebase/auth";
import { APICallHandler, APICallError } from "./apiCallHandler";
import { API_ENDPOINTS } from "./constants";
import { firebaseApp } from "./firebaseConfig";

const firebaseAuth = getAuth(firebaseApp);

function getCurrentUser() {
  return firebaseAuth.currentUser;
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

  switch (code) {
    case "auth/email-already-in-use":
      return "That email address is already in use. Try signing in instead.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/weak-password":
      return "Choose a stronger password with at least 6 characters.";
    case "auth/network-request-failed":
      return "Network connection lost. Check your internet connection and try again.";
    case "auth/too-many-requests":
      return "Too many attempts were made. Please wait a bit and try again.";
    default:
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
