import { FirebaseError, initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, updateProfile } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { toast } from "sonner";

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

export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.log(error);
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



// Google provider
const googleProvider = new GoogleAuthProvider()

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider)

    // Check if user document exists
    const userDoc = await getDoc(doc(db, "users", result.user.uid))

    // If user doesn't exist, create new document
    if (!userDoc.exists()) {
      await setDoc(doc(db, "users", result.user.uid), {
        name: result.user.displayName,
        email: result.user.email,
      })
    }

    window.location.href = "/"
    toast.success("Login successful", {
      description: "Welcome back to Task Manager!",
    })
    return result.user
  } catch (error) {
    if ((error as FirebaseError).code === "auth/popup-closed-by-user") {
      throw new Error("Sign-in cancelled")
    } else {
      throw new Error("Failed to sign in with Google")
    }
  }
}

// Sign up with email and password
export const signUp = async (email: string, password: string, name: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    // Update the user's profile with their name
    await updateProfile(userCredential.user, {
      displayName: name,
    })

    // Create user document in Firestore
    await setDoc(doc(db, "users", userCredential.user.uid), {
      name: name,
      email: email,
    })

    return userCredential.user
  } catch (error) {
    if ((error as FirebaseError).code === "auth/email-already-in-use") {
      throw new Error("Email already in use")
    } else if ((error as FirebaseError).code === "auth/weak-password") {
      throw new Error("Password is too weak")
    } else {
      throw new Error((error as FirebaseError).message)
    }
  }
}

export { auth };