# 🔐 NoteVault — Setup Instructions

A modern, full-stack notes application with Firebase Authentication and Cloud Firestore.

---

## 📋 Prerequisites

- A Google account
- A web browser (Chrome recommended)
- A local development server (e.g., VS Code Live Server, Python's `http.server`, or Node's `http-server`)

---

## 🚀 Step-by-Step Setup

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter a project name (e.g., `notevault`)
4. Disable Google Analytics (optional — not needed for this app)
5. Click **"Create project"**

### 2. Enable Email/Password Authentication

1. In your Firebase project, go to **Build → Authentication**
2. Click **"Get started"**
3. Under **Sign-in method**, click **"Email/Password"**
4. Toggle the **Enable** switch **ON**
5. Click **"Save"**

### 3. Create a Cloud Firestore Database

1. Go to **Build → Firestore Database**
2. Click **"Create database"**
3. Choose a location closest to you (e.g., `us-central`)
4. Select **"Start in test mode"** (we'll update rules below)
5. Click **"Create"**

### 4. Register a Web App

1. Go to **Project Settings** (gear icon) → **General**
2. Scroll down to **"Your apps"** and click the **Web** icon (`</>`)
3. Enter an app nickname (e.g., `notevault-web`)
4. Click **"Register app"**
5. Copy the `firebaseConfig` object — you'll need it in the next step

### 5. Add Your Firebase Config

Open `firebase-config.js` and replace the placeholder values:

```javascript
const firebaseConfig = {
  apiKey:            "AIzaSy...",          // ← Your API key
  authDomain:        "notevault.firebaseapp.com",
  projectId:         "notevault",
  storageBucket:     "notevault.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123"
};
```

### 6. Deploy Firestore Security Rules

1. Go to **Firestore → Rules** in the Firebase Console
2. Replace the default rules with the contents of `firestore.rules` from this project
3. Click **"Publish"**

These rules ensure:
- Only authenticated users can access data
- Each user can **only** read/write their **own** notes
- New notes must include `title`, `content`, and `createdAt` fields

### 7. Run the Application

Since this app uses ES6 modules, you **must** serve it over HTTP (not `file://`).

#### Option A: VS Code Live Server
1. Install the **Live Server** extension in VS Code
2. Right-click `index.html` → **"Open with Live Server"**

#### Option B: Python HTTP Server
```bash
cd "notes with backend firebase"
python -m http.server 8080
```
Then open `http://localhost:8080`

#### Option C: Node HTTP Server
```bash
npx -y http-server . -p 8080
```
Then open `http://localhost:8080`

---

## 📁 Project Structure

```
notes with backend firebase/
├── index.html          # Login / Register page
├── dashboard.html      # Notes dashboard (after login)
├── style.css           # Complete stylesheet (light + dark)
├── firebase-config.js  # Firebase SDK configuration
├── auth.js             # Authentication logic
├── notes.js            # Notes CRUD + real-time + search
├── firestore.rules     # Firestore security rules
└── setup_instructions.md  # This file
```

---

## 🗂️ Firestore Data Structure

```
users (collection)
  └── {userId} (document — implicit)
       └── notes (subcollection)
            ├── {noteId}
            │    ├── title: "My First Note"
            │    ├── content: "Hello world!"
            │    └── createdAt: Timestamp
            ├── {noteId}
            │    ├── title: "Shopping List"
            │    ├── content: "Milk, eggs, bread..."
            │    └── createdAt: Timestamp
            └── ...
```

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **Auth** | Email/password sign-in and sign-up with display name |
| 📝 **CRUD** | Create, read, update, and delete notes |
| ⚡ **Real-time** | Notes update instantly via `onSnapshot` |
| 🔍 **Search** | Filter notes by title or content |
| 🌙 **Dark Mode** | Toggle with localStorage persistence |
| 🎨 **Modern UI** | Glassmorphism, animations, responsive grid |
| 🔒 **Security** | Firestore rules enforce per-user access |
| 📱 **Responsive** | Works on mobile, tablet, and desktop |

---

## 🛠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS / module errors | Make sure you're serving via HTTP, not opening the file directly |
| "Permission denied" | Check Firestore rules are published and match `firestore.rules` |
| Notes not loading | Verify Firebase config in `firebase-config.js` is correct |
| Auth errors | Ensure Email/Password auth is enabled in Firebase Console |

---

## 📝 License

This project is for educational purposes. Feel free to modify and extend!
