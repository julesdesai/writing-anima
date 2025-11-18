import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyDYB4hMJGuh-Ix9vZ3vEvNP7NxM-x0GSuM",
  authDomain: "ai-writing-assistant-c8628.firebaseapp.com",
  projectId: "ai-writing-assistant-c8628",
  storageBucket: "ai-writing-assistant-c8628.firebasestorage.app",
  messagingSenderId: "1030299289678",
  appId: "1:1030299289678:web:431bca438197c8e1e99b1f",
  measurementId: "G-16FN8LBKYQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

export default app;