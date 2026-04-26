import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Use initializeFirestore to allow setting experimentalForceLongPolling for better connectivity in some environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth();

// Test connection
async function testConnection() {
  console.log("Starting Firestore connectivity test");
  console.log("Database ID from config:", firebaseConfig.firestoreDatabaseId);
  try {
    const snap = await getDocFromServer(doc(db, 'healing_stats', 'global'));
    console.log("Firestore connectivity test: Success", snap.exists() ? "(doc exists)" : "(doc does not exist)");
  } catch (error) {
    console.error("Firestore connectivity test: FAILED");
    if (error instanceof Error) {
      console.error("Error Name:", error.name);
      console.error("Error Message:", error.message);
      // @ts-ignore - stack might be useful
      if (error.code) console.error("Error Code:", error.code);
    } else {
      console.error("Unknown error type:", error);
    }
    
    if(error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('unavailable'))) {
      console.warn("Firestore appears to be unavailable. This might be a network issue or missing experimentalForceLongPolling.");
    }
  }
}
testConnection();
