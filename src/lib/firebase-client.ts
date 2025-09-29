
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

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

if (typeof window !== "undefined" && !getApps().length) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} else if (typeof window !== "undefined") {
  app = getApp();
  db = getFirestore(app);
}

// @ts-ignore
export { db };
