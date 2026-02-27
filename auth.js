/**
 * =========================================================
 *  auth.js — Authentication Logic
 * ---------------------------------------------------------
 *  Handles:
 *    • Sign-in with email & password / Google
 *    • Sign-up with email & password / Google
 *    • Email verification flow
 *    • Forgot password flow
 *    • View toggling between the 4 auth views
 * =========================================================
 */

import { auth, googleProvider } from "./firebase-config.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    updateProfile,
    onAuthStateChanged,
    sendEmailVerification,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

// ──────────────────────────────────────────────
//   DOM REFERENCES
// ──────────────────────────────────────────────
const signInView = document.getElementById("signInView");
const signUpView = document.getElementById("signUpView");
const forgotPasswordView = document.getElementById("forgotPasswordView");
const verifyEmailView = document.getElementById("verifyEmailView");

const signInForm = document.getElementById("signInForm");
const signUpForm = document.getElementById("signUpForm");
const resetForm = document.getElementById("resetForm");

const googleSignInBtn = document.getElementById("googleSignInBtn");
const googleSignUpBtn = document.getElementById("googleSignUpBtn");

const showSignUpLink = document.getElementById("showSignUpLink");
const showSignInLink = document.getElementById("showSignInLink");
const showForgotLink = document.getElementById("showForgotLink");
const backToSignInLink = document.getElementById("backToSignInLink");
const verifyBackToSignInLink = document.getElementById("verifyBackToSignInLink");

const verifyEmailText = document.getElementById("verifyEmailText");
const checkVerifiedBtn = document.getElementById("checkVerifiedBtn");
const resendVerifyBtn = document.getElementById("resendVerifyBtn");

const authMessage = document.getElementById("authMessage");

let pendingVerificationUser = null;
let isProcessingAuth = false;

// ──────────────────────────────────────────────
//   VIEW TOGGLING & MESSAGES
// ──────────────────────────────────────────────
function showView(view) {
    [signInView, signUpView, forgotPasswordView, verifyEmailView].forEach((v) => {
        if (v) v.classList.add("hidden");
    });
    if (view) view.classList.remove("hidden");
    clearMessage();
}

showSignUpLink?.addEventListener("click", (e) => { e.preventDefault(); showView(signUpView); });
showSignInLink?.addEventListener("click", (e) => { e.preventDefault(); showView(signInView); });
showForgotLink?.addEventListener("click", (e) => { e.preventDefault(); showView(forgotPasswordView); });
backToSignInLink?.addEventListener("click", (e) => { e.preventDefault(); showView(signInView); });
verifyBackToSignInLink?.addEventListener("click", (e) => {
    e.preventDefault();
    pendingVerificationUser = null;
    isProcessingAuth = false;
    auth.signOut();
    showView(signInView);
});

function showMessage(text, type = "error") {
    authMessage.textContent = text;
    authMessage.className = `auth-message ${type}`;
}

function clearMessage() {
    authMessage.textContent = "";
    authMessage.className = "auth-message";
}

function setLoading(btn, loading) {
    if (loading) {
        btn.classList.add("loading");
        btn.disabled = true;
    } else {
        btn.classList.remove("loading");
        btn.disabled = false;
    }
}

function friendlyError(code) {
    const map = {
        "auth/email-already-in-use": "This email is already registered. Try signing in instead.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/user-not-found": "No account found with this email.",
        "auth/wrong-password": "Incorrect password. Please try again.",
        "auth/weak-password": "Password must be at least 6 characters.",
        "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
        "auth/invalid-credential": "Invalid email or password. Please check and try again.",
        "auth/network-request-failed": "Network error. Check your connection and retry.",
        "auth/popup-closed-by-user": "Sign-in popup was closed. Please try again."
    };
    return map[code] || "Something went wrong. Please try again.";
}

// ──────────────────────────────────────────────
//   AUTH STATE OBSERVER
// ──────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
    if (user && !isProcessingAuth) {
        const isGoogle = user.providerData.some(p => p.providerId === "google.com");
        if (isGoogle || user.emailVerified) {
            window.location.href = "dashboard.html";
        }
    }
});

// ──────────────────────────────────────────────
//   GOOGLE SIGN IN / SIGN UP
// ──────────────────────────────────────────────
async function handleGoogleSignIn(e) {
    clearMessage();

    const isSignUpBtn = e.target.closest('#googleSignUpBtn');
    if (isSignUpBtn) {
        if (!document.getElementById("agreeTermsSignUp").checked) {
            showMessage("You must agree to the Terms & Privacy Policy to continue.", "error");
            return;
        }
    } else {
        if (!document.getElementById("agreeTermsSignIn").checked) {
            showMessage("You must agree to the Terms & Privacy Policy to continue.", "error");
            return;
        }
    }

    isProcessingAuth = true;
    try {
        await signInWithPopup(auth, googleProvider);
        showMessage("Success! Redirecting...", "success");
        setTimeout(() => window.location.href = "dashboard.html", 600);
    } catch (err) {
        showMessage(friendlyError(err.code));
        isProcessingAuth = false;
    }
}

googleSignInBtn?.addEventListener("click", handleGoogleSignIn);
googleSignUpBtn?.addEventListener("click", handleGoogleSignIn);

// ──────────────────────────────────────────────
//   SIGN IN
// ──────────────────────────────────────────────
signInForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessage();

    if (!document.getElementById("agreeTermsSignIn").checked) {
        showMessage("You must agree to the Terms & Privacy Policy to continue.", "error");
        return;
    }

    const email = document.getElementById("signInEmail").value.trim();
    const password = document.getElementById("signInPassword").value;
    const btn = document.getElementById("signInBtn");

    setLoading(btn, true);
    isProcessingAuth = true;

    try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const user = cred.user;

        if (!user.emailVerified) {
            pendingVerificationUser = user;
            verifyEmailText.textContent = `Your email (${email}) is not verified yet. Please check your inbox for the verification link.`;
            showView(verifyEmailView);
            setLoading(btn, false);
            return; // Stay here, do not redirect
        }

        showMessage("Welcome back! Redirecting...", "success");
        setTimeout(() => window.location.href = "dashboard.html", 600);
    } catch (err) {
        showMessage(friendlyError(err.code));
        setLoading(btn, false);
        isProcessingAuth = false;
    }
});

// ──────────────────────────────────────────────
//   SIGN UP
// ──────────────────────────────────────────────
signUpForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessage();

    if (!document.getElementById("agreeTermsSignUp").checked) {
        showMessage("You must agree to the Terms & Privacy Policy to continue.", "error");
        return;
    }

    const name = document.getElementById("signUpName").value.trim();
    const email = document.getElementById("signUpEmail").value.trim();
    const password = document.getElementById("signUpPassword").value;
    const btn = document.getElementById("signUpBtn");

    setLoading(btn, true);
    isProcessingAuth = true;

    try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
        await sendEmailVerification(cred.user);

        pendingVerificationUser = cred.user;
        verifyEmailText.textContent = `We've sent a verification email to ${email}. Please check your inbox and click the link to verify.`;
        showView(verifyEmailView);
        showMessage("Account created! Verify your email to continue.", "success");
    } catch (err) {
        showMessage(friendlyError(err.code));
        isProcessingAuth = false;
    } finally {
        setLoading(btn, false);
    }
});

// ──────────────────────────────────────────────
//   VERIFY EMAIL BUTTONS
// ──────────────────────────────────────────────
checkVerifiedBtn?.addEventListener("click", async () => {
    if (!pendingVerificationUser) return;
    setLoading(checkVerifiedBtn, true);

    try {
        await pendingVerificationUser.reload();
        if (pendingVerificationUser.emailVerified) {
            showMessage("Email verified! Redirecting...", "success");
            setTimeout(() => window.location.href = "dashboard.html", 600);
        } else {
            showMessage("Email not verified yet. Please check your inbox.");
        }
    } catch (err) {
        showMessage(friendlyError(err.code));
    } finally {
        setLoading(checkVerifiedBtn, false);
    }
});

resendVerifyBtn?.addEventListener("click", async () => {
    if (!pendingVerificationUser) return;
    setLoading(resendVerifyBtn, true);

    try {
        await sendEmailVerification(pendingVerificationUser);
        showMessage("Verification email resent!", "success");
    } catch (err) {
        showMessage(friendlyError(err.code));
    } finally {
        setLoading(resendVerifyBtn, false);
    }
});

// ──────────────────────────────────────────────
//   FORGOT PASSWORD
// ──────────────────────────────────────────────
resetForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessage();

    const email = document.getElementById("resetEmail").value.trim();
    const btn = document.getElementById("resetBtn");

    setLoading(btn, true);

    try {
        await sendPasswordResetEmail(auth, email);
        showMessage(`Password reset link sent to ${email}. Check your inbox.`, "success");
    } catch (err) {
        showMessage(friendlyError(err.code));
    } finally {
        setLoading(btn, false);
    }
});
