# GeoDay — Firebase Setup Guide

## Files in this folder

| File | Purpose |
|------|---------|
| `questions.json` | 500 geography questions, Firestore-ready |
| `firestore-import.js` | Run once to upload all questions to Firestore |
| `geoday-firebase-config.js` | Paste into index.html to connect auth + DB |
| `index.html` | Your game file |

---

## Step 1 — Create a Firebase project (10 min, free)

1. Go to **console.firebase.google.com**
2. Click **Add project** → name it `geoday` → Continue
3. Disable Google Analytics (not needed yet) → **Create project**

---

## Step 2 — Enable Authentication

1. In Firebase Console → **Build → Authentication → Get started**
2. **Sign-in method** tab → Enable **Google** → Save
3. Enable **Email/Password** → Save
4. Add your domain: **Authorised domains** → Add `geoday.io`

---

## Step 3 — Create Firestore Database

1. **Build → Firestore Database → Create database**
2. Choose **Start in test mode** (you'll lock it down later)
3. Choose a region close to your users (e.g. `europe-west1` for EU)

---

## Step 4 — Upload the 500 questions

1. In Firebase Console → **Project Settings → Service Accounts**
2. Click **Generate new private key** → save as `serviceAccountKey.json` in this folder
3. In your terminal:
   ```
   npm install firebase-admin
   node firestore-import.js
   ```
4. You should see "Done! All 500 questions uploaded"
5. Verify in Firestore Console → **questions** collection (500 documents)

---

## Step 5 — Get your web config

1. Firebase Console → **Project Settings → General**
2. Scroll to **Your apps** → click the web icon `</>`
3. Register app with nickname `geoday-web`
4. Copy the `firebaseConfig` object
5. Paste it into `geoday-firebase-config.js` replacing the REPLACE_WITH_ placeholders

---

## Step 6 — Firestore Security Rules (important before going live)

In Firebase Console → Firestore → **Rules**, replace the default with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Questions: anyone can read, nobody can write from client
    match /questions/{qId} {
      allow read: if true;
      allow write: if false;
    }

    // Users: only the user themselves can read/write their data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Leaderboard: anyone logged in can read, only write own entry
    match /leaderboard/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## Question bank structure

Each document in the `questions` collection:

```json
{
  "id": "q_001",
  "category": "Capital city",
  "difficulty": "beginner",
  "question": "What is the capital of France?",
  "answers": ["Lyon", "Marseille", "Paris", "Bordeaux"],
  "correct": 2,
  "inputType": "mc",
  "note": "Paris has been France's capital for over 1,000 years."
}
```

**Difficulty breakdown:**
- `beginner`: 125 questions
- `medium`: 210 questions  
- `hard`: 165 questions

**Category breakdown:**
- Capital city: 100
- Challenge (hard trivia): 100
- Geography: 60
- Flag: 50
- Culture & food: 50
- Currency: 40
- Economy: 40
- Dial codes & TLDs: 30
- Languages: 30
