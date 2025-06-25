import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  CACHE_SIZE_UNLIMITED, 
  enableIndexedDbPersistence,
  connectFirestoreEmulator
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyCDWrMoZoQxcYMAA0sDCD-3ybgOESLyDr4",
  authDomain: "liqid-dd431.firebaseapp.com",
  projectId: "liqid-dd431",
  storageBucket: "liqid-dd431.firebasestorage.app",
  messagingSenderId: "945097903452",
  appId: "1:945097903452:web:4336c75a038db09bfc4599",
  measurementId: "G-2J39W6N1CX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with settings optimized for StackBlitz
const firestoreSettings = {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  ignoreUndefinedProperties: true,
  experimentalForceLongPolling: true, // Force long polling for better reliability in StackBlitz
  experimentalAutoDetectLongPolling: false, // Disable auto-detection since we're forcing long polling
};

// Initialize services
export const auth = getAuth(app);
export const db = initializeFirestore(app, firestoreSettings);
export const storage = getStorage(app);

// Initialize analytics only if supported and not in StackBlitz
export const analytics = await isSupported().then(supported => 
  supported && !window.location.host.includes('stackblitz.io') 
    ? getAnalytics(app) 
    : null
).catch(() => null);

// Enable offline persistence with error handling
if (!window.location.host.includes('stackblitz.io')) {
  try {
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time.
        console.warn('Multiple tabs open, persistence disabled');
      } else if (err.code === 'unimplemented') {
        // The current browser doesn't support persistence
        console.warn('Current browser does not support persistence');
      }
    });
  } catch (err) {
    console.warn('Failed to enable persistence:', err);
  }
}

// Connect to Firestore emulator if in development and not in StackBlitz
if (import.meta.env.DEV && !window.location.host.includes('stackblitz.io')) {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
  } catch (err) {
    console.warn('Failed to connect to Firestore emulator:', err);
  }
}

export default app;