// Standalone script to resolve affiliate user email from UID
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.trim().match(/^([^#=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    env[match[1].trim()] = val;
  }
});

const projectId = env.FIREBASE_PROJECT_ID;
const clientEmail = env.FIREBASE_CLIENT_EMAIL;
const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (getApps().length === 0) {
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  });
}

const db = getFirestore();

async function getUserEmail() {
  const uid = 'M2SxWt1bqcdmDnxjuLlDBuqfmrp2';
  try {
    const doc = await db.collection('users').doc(uid).get();
    if (doc.exists) {
      console.log(`User UID: ${uid}`);
      console.log(`    Email: ${doc.data().email}`);
      console.log(`    DisplayName: ${doc.data().displayName}`);
    } else {
      console.log(`No user found with UID: ${uid}`);
    }
  } catch (err) {
    console.error(err);
  }
}

getUserEmail();
