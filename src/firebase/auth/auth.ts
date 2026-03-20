'use client';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, firestore } from '@/firebase';

// Sign up with email and password
export const signUpWithEmail = async (userData: {
  email: string,
  password:  string,
  firstName: string,
  lastName: string,
  username: string
}) => {
  try {
    const { email, password, firstName, lastName, username } = userData;
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create a user document in Firestore
    await setDoc(doc(firestore, 'users', user.uid), {
      uid: user.uid,
      firstName,
      lastName,
      username,
      email: user.email,
      avatarUrl: user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`,
      bio: '',
      followersCount: 0,
      followingCount: 0,
      role: 'user',
      createdAt: serverTimestamp(),
      usernameLastChanged: serverTimestamp(),
    });

    return { user, error: null };
  } catch (error: any) {
    return { user: null, error };
  }
};

// Sign in with email and password
export const signInWithEmail = async (email: string, password:  string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    return { user: null, error };
  }
};

// Sign in with Google
const provider = new GoogleAuthProvider();
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if user exists in Firestore, if not create a new document
    const userRef = doc(firestore, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
       await setDoc(userRef, {
        uid: user.uid,
        firstName: user.displayName?.split(' ')[0] || '',
        lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
        username: user.email?.split('@')[0] || user.uid,
        email: user.email,
        avatarUrl: user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`,
        bio: '',
        followersCount: 0,
        followingCount: 0,
        role: 'user',
        createdAt: serverTimestamp(),
        usernameLastChanged: serverTimestamp(),
      });
    }

    return { user, error: null };
  } catch (error: any) {
    return { user: null, error };
  }
};

// Sign out
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    return { error: null };
  } catch (error: any) {
    return { error };
  }
};
