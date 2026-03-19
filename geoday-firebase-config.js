// geoday-firebase-config.js
// ─────────────────────────────────────────────────────────────────
// Paste this into your index.html <head> AFTER your existing scripts.
// Replace the placeholder values with your real Firebase config.
//
// Find your config:
//   Firebase Console → Project Settings → General → Your apps → Config
// ─────────────────────────────────────────────────────────────────

// 1. Add this to your <head>:
// <script type="module">
//   import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
//   import { getFirestore, collection, getDocs, query, where, doc, setDoc, getDoc, updateDoc, arrayUnion }
//     from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
//   import { getAuth, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword,
//     signInWithEmailAndPassword, onAuthStateChanged, signOut }
//     from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey:            "REPLACE_WITH_YOUR_API_KEY",
  authDomain:        "REPLACE.firebaseapp.com",
  projectId:         "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket:     "REPLACE.appspot.com",
  messagingSenderId: "REPLACE_WITH_YOUR_SENDER_ID",
  appId:             "REPLACE_WITH_YOUR_APP_ID"
};

// ── QUESTION FETCHING (no-repeat logic) ───────────────────────────────────────

// Get 15 unseen questions for a new game
async function fetchUnseenQuestions(db, userId, difficulty = null) {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  const seen = userSnap.exists() ? (userSnap.data().seenQuestions || []) : [];

  let q = query(collection(db, 'questions'));
  if (difficulty) {
    q = query(collection(db, 'questions'), where('difficulty', '==', difficulty));
  }

  const snapshot = await getDocs(q);
  const allQuestions = snapshot.docs.map(d => d.data());

  // Filter out seen questions
  const unseen = allQuestions.filter(q => !seen.includes(q.id));

  // If fewer than 15 unseen remain, reset (user has seen everything)
  const pool = unseen.length >= 15 ? unseen : allQuestions;

  // Shuffle and return 15
  return pool.sort(() => Math.random() - 0.5).slice(0, 15);
}

// Mark questions as seen after a game
async function markQuestionsAsSeen(db, userId, questionIds) {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    seenQuestions: arrayUnion(...questionIds)
  });
}

// ── SCORE SAVING ───────────────────────────────────────────────────────────────

async function saveGameResult(db, userId, result) {
  // result = { score, correct, wrong, questionsAnswered, duration }
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  const data = snap.exists() ? snap.data() : {};

  const newBest = Math.max(data.bestScore || 0, result.score);
  const today = new Date().toDateString();
  const lastPlayed = data.lastPlayed || '';
  const streak = today === lastPlayed
    ? data.streak || 1
    : (isYesterday(lastPlayed) ? (data.streak || 0) + 1 : 1);

  await setDoc(userRef, {
    ...data,
    bestScore: newBest,
    totalScore: (data.totalScore || 0) + result.score,
    gamesPlayed: (data.gamesPlayed || 0) + 1,
    totalCorrect: (data.totalCorrect || 0) + result.correct,
    totalWrong: (data.totalWrong || 0) + result.wrong,
    streak,
    lastPlayed: today,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  // Save to leaderboard collection too
  const lbRef = doc(db, 'leaderboard', userId);
  await setDoc(lbRef, {
    userId,
    displayName: data.displayName || 'Anonymous',
    bestScore: newBest,
    totalScore: (data.totalScore || 0) + result.score,
    gamesPlayed: (data.gamesPlayed || 0) + 1,
    streak,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

function isYesterday(dateStr) {
  if (!dateStr) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return new Date(dateStr).toDateString() === yesterday.toDateString();
}

// ── LEADERBOARD FETCH ──────────────────────────────────────────────────────────

// period: 'daily' | 'weekly' | 'monthly' | 'yearly'
async function fetchLeaderboard(db, period = 'daily', limitCount = 10) {
  const q = query(
    collection(db, 'leaderboard'),
    // orderBy('bestScore', 'desc'),  // enable after creating Firestore index
    // limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => d.data())
    .sort((a, b) => b.bestScore - a.bestScore)
    .slice(0, limitCount);
}
