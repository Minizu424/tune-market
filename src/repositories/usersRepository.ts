import {
  doc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { AppUser, UserRole } from "@/types";

const USERS_COLLECTION = "users";

export const INITIAL_POINT_BALANCE = 100;

export async function getCurrentUserProfile(): Promise<AppUser | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return null;
  }

  return getUserProfile(currentUser.uid);
}

export async function getUserProfile(userId: string): Promise<AppUser | null> {
  const userRef = doc(db, USERS_COLLECTION, userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  return { id: userSnap.id, ...userSnap.data() } as AppUser;
}

export async function createUserDocument(
  userId: string,
  email: string,
  displayName = "",
): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return;
  }

  await setDoc(userRef, {
    email,
    displayName,
    role: "listener",
    pointBalance: INITIAL_POINT_BALANCE,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, userId);
  await updateDoc(userRef, {
    role,
    updatedAt: serverTimestamp(),
  });
}

export async function updateUserPointBalance(
  userId: string,
  diff: number,
): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, userId);
  await updateDoc(userRef, {
    pointBalance: increment(diff),
    updatedAt: serverTimestamp(),
  });
}
