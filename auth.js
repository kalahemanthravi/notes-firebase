/**
 * =========================================================
 *  auth.js — Authentication Logic
 * ---------------------------------------------------------
 *  Handles:
 *    • Sign-in with email & password
 *    • Sign-up with email & password (+ display name)
 *    • Form toggling between sign-in / sign-up
 *    • Redirect to dashboard on successful auth
 *    • Redirect away if user is already signed in
 * =========================================================
 */

import { auth } from "./firebase-config.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

// ──────────────────────────────────────────────
//   DOM REFERENCES
// ──────────────────────────────────────────────
const signInForm = document.getElementById("signInForm");
const signUpForm = document.getElementById("signUpForm");
const toggleLink = document.getElementById("toggleLink");
const toggleText = document.getElementById("toggleText");
const authMessage = document.getElementById("authMessage");

// ──────────────────────────────────────────────
//   AUTH STATE OBSERVER
//   If user is already logged in, send them
//   straight to the dashboard.
// ──────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = "dashboard.html";
    }
});

// ──────────────────────────────────────────────
//   HELPER — Show message (error / success)
// ──────────────────────────────────────────────
/**
 * Displays a styled message inside the auth card.
 * @param {string} text  — The message text
 * @param {"error"|"success"} type — Visual style
 */
function showMessage(text, type = "error") {
    authMessage.textContent = text;
    authMessage.className = `auth-message ${type}`;
}

/** Clears any visible auth message */
function clearMessage() {
    authMessage.textContent = "";
    authMessage.className = "auth-message";
}

// ──────────────────────────────────────────────
//   HELPER — Button loading state
// ──────────────────────────────────────────────
function setLoading(btn, loading) {
    if (loading) {
        btn.classList.add("loading");
        btn.disabled = true;
    } else {
        btn.classList.remove("loading");
        btn.disabled = false;
    }
}

// ──────────────────────────────────────────────
//   FRIENDLY ERROR MESSAGES
//   Maps Firebase error codes to user-readable
//   strings so the UI is never cryptic.
// ──────────────────────────────────────────────
function friendlyError(code) {
    const map = {
        "auth/email-already-in-use": "This email is already registered. Try signing in instead.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/user-not-found": "No account found with this email.",
        "auth/wrong-password": "Incorrect password. Please try again.",
        "auth/weak-password": "Password must be at least 6 characters.",
        "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
        "auth/invalid-credential": "Invalid email or password. Please check and try again.",
        "auth/network-request-failed": "Network error. Check your connection and retry."
    };
    return map[code] || "Something went wrong. Please try again.";
}

// ──────────────────────────────────────────────
//   SIGN IN
// ──────────────────────────────────────────────
signInForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessage();

    const email = document.getElementById("signInEmail").value.trim();
    const password = document.getElementById("signInPassword").value;
    const btn = document.getElementById("signInBtn");

    setLoading(btn, true);

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will handle the redirect
    } catch (err) {
        showMessage(friendlyError(err.code));
        setLoading(btn, false);
    }
});

// ──────────────────────────────────────────────
//   SIGN UP
// ──────────────────────────────────────────────
signUpForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessage();

    const name = document.getElementById("signUpName").value.trim();
    const email = document.getElementById("signUpEmail").value.trim();
    const password = document.getElementById("signUpPassword").value;
    const btn = document.getElementById("signUpBtn");

    setLoading(btn, true);

    try {
        // 1. Create the user account
        const cred = await createUserWithEmailAndPassword(auth, email, password);

        // 2. Attach the display name to the profile
        await updateProfile(cred.user, { displayName: name });

        // 3. onAuthStateChanged will handle the redirect
    } catch (err) {
        showMessage(friendlyError(err.code));
        setLoading(btn, false);
    }
});

// ──────────────────────────────────────────────
//   TOGGLE — Switch between Sign In / Sign Up
// ──────────────────────────────────────────────
let isSignUp = false;

toggleLink.addEventListener("click", (e) => {
    e.preventDefault();
    clearMessage();
    isSignUp = !isSignUp;

    if (isSignUp) {
        signInForm.classList.add("hidden");
        signUpForm.classList.remove("hidden");
        toggleText.innerHTML = 'Already have an account? <a href="#" id="toggleLink">Sign In</a>';
    } else {
        signUpForm.classList.add("hidden");
        signInForm.classList.remove("hidden");
        toggleText.innerHTML = 'Don\'t have an account? <a href="#" id="toggleLink">Sign Up</a>';
    }

    // Re-attach listener to the newly created link element
    document.getElementById("toggleLink").addEventListener("click", (ev) => {
        ev.preventDefault();
        toggleLink.click(); // delegate to existing handler via the outer reference
    });
});
