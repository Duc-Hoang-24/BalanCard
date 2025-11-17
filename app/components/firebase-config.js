import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAOuYNzMtYWmzy-o4W8q53Wb1f55X31-eU",
  authDomain: "flashcard-9c4b9.firebaseapp.com",
  projectId: "flashcard-9c4b9",
  storageBucket: "flashcard-9c4b9.firebasestorage.app",
  messagingSenderId: "724146622689",
  appId: "1:724146622689:web:81b4c4eaee1ad0a31167a0",
  measurementId: "G-QLCY3TCRD4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app)