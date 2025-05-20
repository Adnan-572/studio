
// IMPORTANT: Firebase Initialization File
// -----------------------------------------
// This file initializes the Firebase app. It relies on environment variables
// for Firebase configuration.
//
// CRITICAL SETUP STEP:
// 1. Create a file named `.env.local` in the ROOT of your project (the same
//    directory as `package.json`).
// 2. Add your Firebase project's configuration to `.env.local`.
//    It should look like this (replace placeholders with your actual values):
//
//    NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyYOUR_KEY_HERE...
//    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
//    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
//    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
//    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
//    NEXT_PUBLIC_FIREBASE_APP_ID=1:your-app-id:web:your-web-app-id
//    NEXT_PUBLIC_DEVELOPER_EMAIL=developer@example.com // Optional for developer features
//
// 3. YOU MUST RESTART your Next.js development server after creating or
//    modifying the `.env.local` file for the changes to take effect.
//    (Stop the server with Ctrl+C and run `npm run dev` again).
//
// If Firebase is not initializing, the MOST LIKELY cause is an issue with
// your `.env.local` file (missing, in the wrong location, incorrect values,
// or server not restarted).
// -----------------------------------------

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Log environment variables for debugging (server-side only during build/startup)
if (typeof window === 'undefined') {
  console.log("--- Firebase Initialization Attempt (Server-side/Build) ---");
  console.log("NEXT_PUBLIC_FIREBASE_API_KEY:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "SET" : "NOT SET or UNDEFINED");
  console.log("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:", process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? "SET" : "NOT SET or UNDEFINED");
  console.log("NEXT_PUBLIC_FIREBASE_PROJECT_ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "SET" : "NOT SET or UNDEFINED");
  console.log("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:", process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? "SET" : "NOT SET or UNDEFINED");
  console.log("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:", process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? "SET" : "NOT SET or UNDEFINED");
  console.log("NEXT_PUBLIC_FIREBASE_APP_ID:", process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? "SET" : "NOT SET or UNDEFINED");
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;

// Check for missing essential config values
const missingKeys: string[] = [];
if (!firebaseConfig.apiKey) missingKeys.push("apiKey");
if (!firebaseConfig.authDomain) missingKeys.push("authDomain");
if (!firebaseConfig.projectId) missingKeys.push("projectId");
if (!firebaseConfig.appId) missingKeys.push("appId"); // App ID is generally important

if (missingKeys.length > 0) {
  const errorMessage = 
    `CRITICAL Firebase Config Error: The following Firebase config values are missing in your .env.local file or environment: ${missingKeys.join(', ')}. ` +
    "Firebase will NOT be initialized. \n" +
    "Ensure your .env.local file in the project root has all NEXT_PUBLIC_FIREBASE_ variables set correctly AND you have RESTARTED your dev server.";
  console.error(errorMessage);
  // In a client-side context, you might want to throw an error or display this to the user.
  // For server-side, this log is crucial.
  // @ts-ignore - Deliberately not initializing app to prevent further errors with a bad config
  app = null; 
} else {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
}

// @ts-ignore - app might be null if config is missing
const auth = app ? getAuth(app) : null;
// @ts-ignore - app might be null
const db = app ? getFirestore(app) : null;
// @ts-ignore - app might be null
const storage = app ? getStorage(app) : null;

// Set persistence if auth is available
if (auth) {
  setPersistence(auth, browserLocalPersistence)
    .catch((error) => {
      console.error("Error setting Firebase auth persistence:", error);
    });
}

export { app, auth, db, storage, firebaseConfig };
