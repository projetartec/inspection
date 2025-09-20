import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "studio-8357723187-49b45",
  appId: "1:599561783967:web:846473323f856a147870aa",
  apiKey: "AIzaSyC7sLA6P5F5kf7uDZAlPq843WPi-IrYQIY",
  authDomain: "studio-8357723187-49b45.firebaseapp.com",
  measurementId: "",
  messagingSenderId: "599561783967"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };
