import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import firebaseAppletConfig from '../../firebase-applet-config.json';

const metaEnv = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : ({} as any);

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain,
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId,
  measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID || firebaseAppletConfig.measurementId || ""
};

// --------------------------------------------------------------------------
// FIREBASE DEPLOYMENT DOCTOR
// --------------------------------------------------------------------------
if (typeof window !== 'undefined') {
  console.log("%c[FIREBASE ACTIVE CONFIG]", "color: #2196F3; font-weight: bold; font-size: 14px;");
  console.log("Project ID:", firebaseConfig.projectId);
  console.log("Auth Domain:", firebaseConfig.authDomain);
  console.log("App ID:", firebaseConfig.appId);
  
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error("%c[CRITICAL ERROR] Firebase variables are MISSING! Check Vercel Environment Variables.", "color: #f44336; font-weight: bold; font-size: 16px;");
  }
}
// --------------------------------------------------------------------------

const EXPECTED_PROJECT_ID = 'menta-imobiliaria1';

if (firebaseConfig.projectId !== EXPECTED_PROJECT_ID) {
  console.log(`%c[FIREBASE PROJECT INFO]`, "color: #2196F3; font-weight: bold; font-size: 16px;");
  console.log(`O app está rodando no projeto: ${firebaseConfig.projectId}`);
  console.log(`Projeto esperado em produção: ${EXPECTED_PROJECT_ID}`);
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Always pass the firestoreDatabaseId if defined in fallback/env to ensure connection to correct database instance in all environments
// However, ONLY use block databaseId if we are on the AI Studio project or if VITE_FIREBASE_DATABASE_ID is explicitly provided
const databaseId = metaEnv.VITE_FIREBASE_DATABASE_ID || 
  (firebaseConfig.projectId === firebaseAppletConfig.projectId ? firebaseAppletConfig.firestoreDatabaseId : undefined);
export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Analytics if supported
export const analytics = isSupported().then(yes => yes ? getAnalytics(app) : null);

export default app;
