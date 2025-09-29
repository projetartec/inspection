
'use server';

import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App;
let adminDb: Firestore;

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : undefined;

if (!getApps().length) {
  app = initializeApp({
    credential: cert(serviceAccount || {
      "projectId": "studio-8357723187-fe66d",
      "privateKey": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
      "clientEmail": "firebase-adminsdk-...@studio-8357723187-fe66d.iam.gserviceaccount.com"
    })
  });
} else {
  app = getApps()[0];
}

adminDb = getFirestore(app);

export { adminDb };
