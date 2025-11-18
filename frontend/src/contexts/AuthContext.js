import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign up function
  async function signup(email, password, displayName) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update the user profile with display name
    await updateProfile(result.user, {
      displayName: displayName
    });

    // Create user document in Firestore
    await setDoc(doc(db, 'users', result.user.uid), {
      displayName: displayName,
      email: email,
      createdAt: new Date().toISOString(),
      projects: [],
      settings: {
        defaultAIProvider: 'openai',
        autoSaveInterval: 30000, // 30 seconds
        enableRealTimeSync: true
      }
    });

    return result;
  }

  // Sign in function
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Sign out function
  function logout() {
    return signOut(auth);
  }

  // Get user data from Firestore
  async function getUserData() {
    if (!currentUser) return null;
    
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    return userDoc.exists() ? userDoc.data() : null;
  }

  // Update user data in Firestore
  async function updateUserData(data) {
    if (!currentUser) return;
    
    await setDoc(doc(db, 'users', currentUser.uid), data, { merge: true });
  }

  // Save custom prompts to user profile
  async function saveCustomPrompts(customPrompts) {
    if (!currentUser) return;
    
    await setDoc(doc(db, 'users', currentUser.uid), {
      customPrompts
    }, { merge: true });
  }

  // Get custom prompts from user profile
  async function getCustomPrompts() {
    if (!currentUser) return null;
    
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    const userData = userDoc.exists() ? userDoc.data() : null;
    return userData?.customPrompts || null;
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
    getUserData,
    updateUserData,
    saveCustomPrompts,
    getCustomPrompts,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}