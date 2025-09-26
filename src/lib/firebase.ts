import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBapAHUmTH21SRQ3994mGwTdicWCc3SYV8",
  authDomain: "studio-8357723187-fe66d.firebaseapp.com",
  projectId: "studio-8357723187-fe66d",
  storageBucket: "studio-8357723187-fe66d.appspot.com",
  messagingSenderId: "81481237270",
  appId: "1:81481237270:web:abd17e791865c651e20637",
  measurementId: ""
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
