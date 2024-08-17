import axios from "axios";
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { FirebaseError } from "firebase/app";
import { AxiosError } from "axios";
import { config } from "dotenv";

config({ path: ".env" });

import {
  User,
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  UserCredential,
  Unsubscribe,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

const auth = getAuth(app);

const provider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const token = await user.getIdToken();

    await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return result;
  } catch (error) {
    if (
      error instanceof FirebaseError ||
      error instanceof AxiosError ||
      error instanceof Error
    ) {
      console.error("Error during Google sign-in:", error.message);
    } else {
      console.error("Unknown error during Google sign-in");
    }
    throw error;
  }
};

export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
    console.log("User signed out successfully.");
  } catch (error) {
    if (error instanceof FirebaseError || error instanceof Error) {
      console.error("Error signing out:", error.message);
    } else {
      console.error("Unknown error signing out");
    }
    throw error;
  }
};
