
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

// This configuration is public and safe to expose on the client-side.
// Security is handled by Firestore Security Rules.
const firebaseConfig = {
  apiKey: "AIzaSyBapAHUmTH21SRQ3994mGwTdicWCc3SYV8",
  authDomain: "studio-8357723187-fe66d.firebaseapp.com",
  projectId: "studio-8357723187-fe66d",
  storageBucket: "studio-8357723187-fe66d.appspot.com",
  messagingSenderId: "81481237270",
  appId: "1:81481237270:web:abd17e791865c651e20637",
  measurementId: ""
};

let app: FirebaseApp;
let db: Firestore;

if (typeof window !== "undefined") {
    if (!getApps().length) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApp();
    }
    db = getFirestore(app);
}

// @ts-ignore - This prevents a TypeScript error when db is used in files that might also run on the server.
export { db };
