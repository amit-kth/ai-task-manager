import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB0MVZoN3dnvWBw3Trimv-Qw4oawVbMUBM",
  authDomain: "task-manager-4e228.firebaseapp.com",
  projectId: "task-manager-4e228",
  storageBucket: "task-manager-4e228.firebasestorage.app",
  messagingSenderId: "126430701617",
  appId: "1:126430701617:web:63cffe7e8f232620db4d10",
  measurementId: "G-HM9XK7LV09"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export const db = getFirestore();

export const signUp = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
};

export { auth };