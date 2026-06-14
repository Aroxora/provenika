import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, logEvent, type Analytics } from 'firebase/analytics';

// Firebase web config. These values are NOT secrets — Firebase web API keys are
// public client identifiers; access is controlled by Firebase Security Rules.
export const firebaseConfig = {
  apiKey: 'AIzaSyDtZsmRnEWStyhk8YB98d7PvhJCPi2GpAw',
  authDomain: 'cancer-cure-osint.firebaseapp.com',
  projectId: 'cancer-cure-osint',
  storageBucket: 'cancer-cure-osint.firebasestorage.app',
  messagingSenderId: '14580146731',
  appId: '1:14580146731:web:394022a2bdf805d354c06e',
  measurementId: 'G-CP71P0L6QD',
};

let app: FirebaseApp | undefined;
let analytics: Analytics | undefined;

/** Synchronously ensure the Firebase app exists (Auth/Firestore need it before init resolves). */
export function ensureApp(): FirebaseApp {
  if (!app) app = initializeApp(firebaseConfig);
  return app;
}

/** Initialize Firebase once, enabling Analytics only where supported (browser). */
export async function initFirebase(): Promise<void> {
  if (app) return;
  app = initializeApp(firebaseConfig);
  try {
    if (await isSupported()) analytics = getAnalytics(app);
  } catch {
    /* analytics unsupported (e.g. SSR / unsupported browser) — non-fatal */
  }
}

/**
 * Log a Firebase Analytics (GA4) event. No-op when Analytics is unavailable
 * (unsupported browser, blocked, or before init resolves) — never throws.
 * No PII is sent; params are the (public) target/query the user chose.
 */
export function track(name: string, params?: Record<string, unknown>): void {
  try {
    if (analytics) logEvent(analytics, name as never, params as never);
  } catch {
    /* analytics blocked / not ready — ignore */
  }
}

export { app, analytics };
