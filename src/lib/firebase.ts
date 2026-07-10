// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// MVPでは Firebase Storage は使用しない（URL方式）。
// Storage解放（実装・マネタイズ計画 Phase 13）の際に getStorage を再導入する。

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBmJ7Sc8ZCnJrQ27a2Rsei8_kQ0FJVlELA",
  authDomain: "tune-market.firebaseapp.com",
  projectId: "tune-market",
  storageBucket: "tune-market.firebasestorage.app",
  messagingSenderId: "259318601563",
  appId: "1:259318601563:web:7505a3243d50294a576c7e",
  measurementId: "G-H72EBKY33V"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export { app };
