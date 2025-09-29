
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
    // This is a placeholder and will not work. Set the env var.
    serviceAccount = {
      "projectId": "your-project-id",
      "privateKey": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n".replace(/\\n/g, '\n'),
      "clientEmail": "your-service-account-email@your-project-id.iam.gserviceaccount.com"
    }
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
