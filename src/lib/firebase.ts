
// IMPORTANT: Firebase Initialization File
// -----------------------------------------
// This file initializes the Firebase app. It relies on environment variables
// for Firebase configuration.
//
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// CRITICAL SETUP STEP FOR RESOLVING "INVALID API KEY" OR "MISSING CONFIG" ERRORS:
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//
// 1. CREATE THE `.env.local` FILE:
//    - In the ROOT DIRECTORY of your project (the SAME FOLDER as `package.json`,
//      `next.config.ts`, and the `src` folder), create a file named EXACTLY `.env.local`.
//    - DO NOT put it inside the `src` folder or any other subfolder.
//
// 2. ADD YOUR FIREBASE CREDENTIALS TO `.env.local`:
//    - Open the `.env.local` file and add your Firebase project's configuration.
//    - It MUST look like this (replace placeholders with your ACTUAL values from Firebase):
//
//      NEXT_PUBLIC_FIREBASE_API_KEY=your_actual_api_key
//      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_actual_auth_domain
//      NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_actual_project_id
//      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_actual_storage_bucket_or_empty
//      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_actual_messaging_sender_id_or_empty
//      NEXT_PUBLIC_FIREBASE_APP_ID=your_actual_app_id
//      NEXT_PUBLIC_DEVELOPER_EMAIL=developer@example.com // Optional for developer features
//
//    - Get these values from your Firebase project: Firebase Console -> Project Settings (gear icon)
//      -> General tab -> Your apps -> Select your web app -> Config.
//    - Ensure variable names start with `NEXT_PUBLIC_`.
//    - Do NOT use quotes around the values unless the values themselves contain special characters (rare for Firebase keys).
//
// 3. RESTART YOUR NEXT.JS DEVELOPMENT SERVER:
//    - This is THE MOST IMPORTANT STEP after creating or changing `.env.local`.
//    - Stop your server (Ctrl+C in the terminal where `npm run dev` is running).
//    - Run `npm run dev` again.
//    - Next.js ONLY loads `.env.local` variables when the server STARTS.
//
// 4. CHECK TERMINAL LOGS (WHEN YOU RUN `npm run dev`):
//    - After restarting, check the terminal output. The `console.log` statements below
//      will show if Next.js is picking up your environment variables. If they show
//      "NOT SET or UNDEFINED" or if the `firebaseConfig` object shows undefined values,
//      then there's an issue with your `.env.local` file (location, name, content)
//      OR you did not restart the server after making changes.
// -----------------------------------------

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Log environment variables for debugging (server-side only during build/startup)
// This helps diagnose if Next.js is picking up the .env.local file correctly.
if (typeof window === 'undefined') {
  console.log("--- Firebase Initialization Attempt (Server-side/Build) ---");
  console.log("Reading environment variables for Firebase config:");
  console.log("NEXT_PUBLIC_FIREBASE_API_KEY:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "SET" : "NOT SET or UNDEFINED - Value:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
  console.log("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:", process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? "SET" : "NOT SET or UNDEFINED - Value:", process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
  console.log("NEXT_PUBLIC_FIREBASE_PROJECT_ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "SET" : "NOT SET or UNDEFINED - Value:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  console.log("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:", process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? "SET (can be empty if not used)" : "NOT SET or UNDEFINED (can be empty if not used) - Value:", process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
  console.log("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:", process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? "SET (can be empty if not used)" : "NOT SET or UNDEFINED (can be empty if not used) - Value:", process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID);
  console.log("NEXT_PUBLIC_FIREBASE_APP_ID:", process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? "SET" : "NOT SET or UNDEFINED - Value:", process.env.NEXT_PUBLIC_FIREBASE_APP_ID);
  console.log("--- End of Raw Environment Variable Check ---");
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// This log helps verify the actual config object being used for initialization.
// It runs on both server (during build/startup) and client.
// Check your server terminal AND browser console for this log.
console.log("Firebase config object constructed for initialization:", firebaseConfig);


let app: FirebaseApp;

// Check for missing essential config values that will definitely cause initialization to fail
const missingKeys: string[] = [];
if (!firebaseConfig.apiKey) missingKeys.push("apiKey");
if (!firebaseConfig.authDomain) missingKeys.push("authDomain");
if (!firebaseConfig.projectId) missingKeys.push("projectId");
if (!firebaseConfig.appId) missingKeys.push("appId"); // App ID is generally critical

if (missingKeys.length > 0) {
  const errorMessage =
    `CRITICAL Firebase Config Error: The following Firebase config values are MISSING or UNDEFINED when constructing the firebaseConfig object: ${missingKeys.join(', ')}. ` +
    "Firebase will NOT be initialized. \n" +
    "==> Please meticulously check your `.env.local` file in the PROJECT ROOT directory for correct variable names (e.g., NEXT_PUBLIC_FIREBASE_API_KEY) and accurate values. \n" +
    "==> CRUCIALLY, you MUST RESTART your Next.js development server (npm run dev) after creating or changing the .env.local file. \n" +
    "==> Review the terminal logs when your server starts for messages about 'NOT SET or UNDEFINED' environment variables.";
  console.error(errorMessage);
  // In a client-side context, you might want to throw an error or display this to the user.
  // For server-side, this log is crucial.
  // @ts-ignore - Deliberately not initializing app to prevent further errors with a bad config
  app = null;
} else {
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      if (typeof window === 'undefined') { // Server-side log
        console.log("Firebase app initialized successfully on the server.");
      } else { // Client-side log
        console.log("Firebase app initialized successfully on the client.");
      }
    } catch (error) {
      console.error("!!! Firebase initialization FAILED during initializeApp(firebaseConfig) call with error:", error);
      console.error("This usually means the config values, though present, might be malformed or incorrect for your Firebase project (e.g., wrong API key format, incorrect projectId). Double-check the values copied from your Firebase console.");
      // @ts-ignore
      app = null;
    }
  } else {
    app = getApps()[0];
    if (typeof window === 'undefined') {
      console.log("Firebase app already initialized on the server (reusing existing instance).");
    } else {
      console.log("Firebase app already initialized on the client (reusing existing instance).");
    }
  }
}

// Initialize Firebase services only if the app was successfully initialized
// @ts-ignore - app might be null if config is missing or initialization failed
const auth = app ? getAuth(app) : null;
// @ts-ignore - app might be null
const db = app ? getFirestore(app) : null;
// @ts-ignore - app might be null
const storage = app ? getStorage(app) : null;

// Set persistence if auth is available and we are in a browser environment
if (auth && typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence)
    .then(() => {
      console.log("Firebase auth persistence set to browserLocalPersistence.");
    })
    .catch((error) => {
      console.error("Error setting Firebase auth persistence:", error);
    });
} else if (!auth && app && typeof window === 'undefined') { // Server-side
  console.warn("Firebase Auth instance could not be created on the server, likely due to initialization failure. Auth persistence not set.");
} else if (!auth && app) { // Client-side
  console.warn("Firebase Auth instance could not be created on the client, likely due to initialization failure. Auth persistence not set.");
}


export { app, auth, db, storage, firebaseConfig };
