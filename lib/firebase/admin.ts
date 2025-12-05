import "server-only";
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";

let adminApp: App | null = null;
let adminAuth: Auth | null = null;

// Only initialize if all required credentials are present
// This prevents build-time errors when env vars are missing
function initializeAdmin() {
  // Check if already initialized
  if (adminAuth) {
    return adminAuth;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  // Firebase Admin SDK requires project_id (snake_case), not projectId
  if (!projectId || !clientEmail || !privateKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "Firebase Admin credentials missing. Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY to your environment variables."
      );
    }
    return null;
  }

  const serviceAccount = {
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey,
  };

  try {
    adminApp =
      getApps().length === 0
        ? initializeApp({
            credential: cert(serviceAccount as any),
          })
        : getApps()[0];
    adminAuth = getAuth(adminApp);
    return adminAuth;
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
    return null;
  }
}

// Lazy initialization - only initialize when accessed
export function getAdminAuth(): Auth | null {
  if (!adminAuth) {
    adminAuth = initializeAdmin();
  }
  return adminAuth;
}

// Export for backward compatibility (but prefer getAdminAuth)
export { adminAuth };