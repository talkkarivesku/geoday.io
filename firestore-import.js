// firestore-import.js
// ─────────────────────────────────────────────────────────────────
// Run this ONCE to upload all 500 questions to Firestore.
//
// Prerequisites:
//   1. npm install firebase-admin
//   2. Download your Firebase service account key:
//      Firebase Console → Project Settings → Service Accounts → Generate new private key
//      Save it as serviceAccountKey.json in this same folder
//
// Run:
//   node firestore-import.js
// ─────────────────────────────────────────────────────────────────

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
const questions = require('./questions.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function importQuestions() {
  console.log(`Uploading ${questions.length} questions...`);
  
  const batch_size = 499; // Firestore batch limit
  let uploaded = 0;

  for (let i = 0; i < questions.length; i += batch_size) {
    const batch = db.batch();
    const chunk = questions.slice(i, i + batch_size);
    
    chunk.forEach(q => {
      const ref = db.collection('questions').doc(q.id);
      batch.set(ref, {
        ...q,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
    uploaded += chunk.length;
    console.log(`  Uploaded ${uploaded}/${questions.length}`);
  }

  console.log('Done! All questions uploaded to Firestore.');
  process.exit(0);
}

importQuestions().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
