import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

import firebaseConfigLocal from '../../firebase-applet-config.json';

// --------------------------------------------------------------------------
// FIREBASE DEPLOYMENT DOCTOR
// This helps verify if Vercel Environment Variables are correctly propagated.
// --------------------------------------------------------------------------
if (typeof window !== 'undefined') {
  console.log("%c[FIREBASE DOCTOR]", "color: #E5BC53; font-weight: bold; font-size: 14px;");
  console.log("Domain:", window.location.hostname);
  console.log("Project ID:", import.meta.env.VITE_FIREBASE_PROJECT_ID || "FALLBACK (Config Local)");
  console.log("Auth Domain:", import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "FALLBACK (Config Local)");
  console.log("Database ID:", import.meta.env.VITE_FIREBASE_DATABASE_ID || "DEFAULT");
  
  if (!import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    console.warn("%c[WARNING] VITE_FIREBASE_PROJECT_ID is NOT defined in environment. Using fallback from firebase-applet-config.json.", "color: #ff9800; font-weight: bold;");
  }
}
// --------------------------------------------------------------------------

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigLocal.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigLocal.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigLocal.projectId,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigLocal.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigLocal.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfigLocal.measurementId
};

const EXPECTED_PROJECT_ID = 'menta-imobiliaria1';

if (firebaseConfig.projectId !== EXPECTED_PROJECT_ID) {
  console.error(`%c[FIREBASE PROJECT MISMATCH]`, "color: #f44336; font-weight: bold; font-size: 16px;");
  console.error(`O app está rodando no projeto: ${firebaseConfig.projectId}`);
  console.error(`Deveria estar rodando no projeto: ${EXPECTED_PROJECT_ID}`);
  console.error("Verifique as variáveis VITE_FIREBASE_* no painel da Vercel.");
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app, import.meta.env.VITE_FIREBASE_DATABASE_ID || (firebaseConfigLocal as any).firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Analytics if supported
export const analytics = isSupported().then(yes => yes ? getAnalytics(app) : null);

export default app;
