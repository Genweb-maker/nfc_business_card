import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDgaHhBiiSSfHQFmjfvpsQbvNQ0tv8-oes",
  authDomain: "nfcbusinesscard-81a48.firebaseapp.com",
  projectId: "nfcbusinesscard-81a48",
  storageBucket: "nfcbusinesscard-81a48.firebasestorage.app",
  messagingSenderId: "53447193809",
  appId: "1:53447193809:web:348a650f399c456b6101f0",
  measurementId: "G-EBG3SN6XRP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

export default app; 