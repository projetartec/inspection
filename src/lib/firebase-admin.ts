
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App;
let adminDb: Firestore;

// This will throw an error if the environment variable is not set, which is good.
// It's better to fail fast than to have silent errors.
const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountString) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable not set. Application cannot start.');
}

const serviceAccount = JSON.parse(serviceAccountString);

// The private key needs to have newlines restored.
if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}

if (!getApps().length) {
    app = initializeApp({
      credential: cert(serviceAccount)
    });
} else {
  app = getApps()[0];
}

adminDb = getFirestore(app);

export { adminDb };
