
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App | undefined;
let adminDb: Firestore | undefined;

function initializeFirebaseAdmin() {
    if (getApps().length > 0) {
        app = getApps()[0];
        adminDb = getFirestore(app);
        return;
    }

    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (!serviceAccountString) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable not set. Application cannot start.');
    }

    try {
        const serviceAccount = JSON.parse(serviceAccountString);

        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        app = initializeApp({
          credential: cert(serviceAccount)
        });
        adminDb = getFirestore(app);
    } catch (e) {
        console.error("Failed to parse or initialize Firebase Admin SDK", e);
        throw new Error("Could not initialize Firebase Admin. Check service account key.")
    }
}

// Initialize on first import in a server environment.
if (typeof window === 'undefined') {
    initializeFirebaseAdmin();
}


export { adminDb };
