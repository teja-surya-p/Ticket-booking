import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { firebaseApp } from "./firebaseConfig";
import "./firebaseStorage.module.css";
let bucketMissingCache = null;
function getStorageSetupUrl() {
  const projectId = firebaseApp.options.projectId ?? "";
  return projectId ? `https://console.firebase.google.com/project/${projectId}/storage` : "https://console.firebase.google.com";
}
function getConfiguredBucketName() {
  return String(firebaseApp.options.storageBucket ?? "").trim();
}
function isFirebaseStorageError(error) {
  return typeof error === "object" && error !== null && "code" in error && String(error.code).startsWith("storage/");
}
function getFirebaseStorageErrorCode(error) {
  return isFirebaseStorageError(error) ? String(error.code) : "";
}
async function isConfiguredBucketMissing() {
  if (bucketMissingCache !== null) {
    return bucketMissingCache;
  }
  const bucketName = getConfiguredBucketName();
  if (!bucketName) {
    return false;
  }
  try {
    const response = await fetch(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucketName)}`, {
      method: "GET"
    });
    const missing = response.status === 404;
    bucketMissingCache = missing;
    return missing;
  } catch {
    return false;
  }
}
function buildStorageNotConfiguredMessage(bucketName) {
  const setupUrl = getStorageSetupUrl();
  return `Firebase Storage bucket '${bucketName}' does not exist. Open ${setupUrl} and click "Get started" for Storage, then retry.`;
}
function sanitizeSegment(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
function getExtension(fileName) {
  const parts = fileName.split(".");
  return parts.length > 1 ? `.${parts[parts.length - 1].toLowerCase()}` : "";
}
export async function uploadMovieAssetToStorage(file, assetType, movieTitle) {
  if (typeof window === "undefined") {
    throw new Error("File upload is only supported in the browser.");
  }
  const bucketName = getConfiguredBucketName();
  if (!bucketName) {
    throw new Error("Missing NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET. Add it to your frontend environment config and restart the app.");
  }
  const bucketMissing = await isConfiguredBucketMissing();
  if (bucketMissing) {
    throw new Error(buildStorageNotConfiguredMessage(bucketName));
  }
  const storage = getStorage(firebaseApp);
  // Fail fast on persistent upload failures so the UI can display actionable errors.
  storage.maxUploadRetryTime = 10_000;
  const titleSegment = sanitizeSegment(movieTitle || "untitled-movie");
  const extension = getExtension(file.name);
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const folder = `movies/${titleSegment}/${assetType}`;
  const fileName = `${sanitizeSegment(file.name.replace(/\.[^/.]+$/, "")) || assetType}-${unique}${extension}`;
  const path = `${folder}/${fileName}`;
  const fileRef = ref(storage, path);
  try {
    await uploadBytes(fileRef, file, {
      contentType: file.type || undefined
    });
    const url = await getDownloadURL(fileRef);
    return {
      name: file.name,
      path,
      url
    };
  } catch (error) {
    const code = getFirebaseStorageErrorCode(error);
    if (code === "storage/unknown" || code === "storage/retry-limit-exceeded") {
      const bucketMissing = await isConfiguredBucketMissing();
      if (bucketMissing) {
        throw new Error(buildStorageNotConfiguredMessage(bucketName));
      }
    }
    throw error;
  }
}
