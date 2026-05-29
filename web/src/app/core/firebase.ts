import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';

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

export { app, analytics };
