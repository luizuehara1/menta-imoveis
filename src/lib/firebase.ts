import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
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
  console.error(`%c[FIREBASE PROJECT MISMATCH]`, "color: #f44336; font-weight: bold; font-size: 16px;");
  console.error(`O app está rodando no projeto: ${firebaseConfig.projectId}`);
  console.error(`Deveria estar rodando no projeto: ${EXPECTED_PROJECT_ID}`);
  console.error("Verifique as variáveis VITE_FIREBASE_* no painel da Vercel.");
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
// Always use the default database for the project unless VITE_FIREBASE_DATABASE_ID is explicitly provided
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Analytics if supported
export const analytics = isSupported().then(yes => yes ? getAnalytics(app) : null);

export default app;
