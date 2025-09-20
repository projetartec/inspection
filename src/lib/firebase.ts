import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "studio-8357723187-fe66d",
  appId: "1:81481237270:web:abd17e791865c651e20637",
  apiKey: "AIzaSyBapAHUmTH21SRQ3994mGwTdicWCc3SYV8",
  authDomain: "studio-8357723187-fe66d.firebaseapp.com",
  measurementId: "",
  messagingSenderId: "81481237270"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };
