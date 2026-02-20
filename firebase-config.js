/**
 * =========================================================
 *  firebase-config.js — Firebase Configuration & Initialization
 * ---------------------------------------------------------
 *  This module initialises the Firebase app and exports
 *  references to Authentication and Firestore services.
 *
 *  ⚠️  IMPORTANT:
 *  Replace the placeholder config below with your actual
 *  Firebase project credentials from the Firebase Console:
 *    → Project Settings → General → Your apps → Config
 * =========================================================
 */

// ---------- Firebase SDK imports (CDN — ES module) ----------
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// ---------- Firebase project configuration ----------
const firebaseConfig = {
    apiKey: "AIzaSyAUGcoRgtcxK49EDEpyYB7MPVHEbSU1_5I",
    authDomain: "notes-94c9c.firebaseapp.com",
    projectId: "notes-94c9c",
    storageBucket: "notes-94c9c.firebasestorage.app",
    messagingSenderId: "994611817691",
    appId: "1:994611817691:web:1b730ed16f8ea350ec30fe",
    measurementId: "G-P62E853LDK"
};

// ---------- Initialize Firebase ----------
const app = initializeApp(firebaseConfig);

// ---------- Export service references ----------
/** Firebase Authentication instance */
export const auth = getAuth(app);

/** Cloud Firestore instance */
export const db = getFirestore(app);
