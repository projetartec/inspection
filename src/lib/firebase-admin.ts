
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App;
let adminDb: Firestore;

let serviceAccount: any;

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        // Correctly format the private key
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
    } catch (e) {
        console.error('Failed to parse Firebase service account key from environment variable.', e);
    }
} else {
    // Fallback for local development if env var is not set
    console.warn("FIREBASE_SERVICE_ACCOUNT_KEY environment variable not set. Using fallback credentials.");
    serviceAccount = {
      "projectId": "studio-8357723187-fe66d",
      "privateKey": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n".replace(/\\n/g, '\n'),
      "clientEmail": "firebase-adminsdk-...@studio-8357723187-fe66d.iam.gserviceaccount.com"
    }
}


if (!getApps().length) {
  try {
    app = initializeApp({
      credential: cert(serviceAccount)
    });
  } catch(e) {
    console.error('Failed to initialize Firebase Admin SDK.', e);
    // This will prevent the app from crashing and log a more useful error.
    // The data functions will then fail, but we'll know why.
  }
} else {
  app = getApps()[0];
}

// @ts-ignore
if (app) {
    adminDb = getFirestore(app);
}


export { adminDb };
