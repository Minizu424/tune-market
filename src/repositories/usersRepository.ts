import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { AppUser } from "@/types";

const USERS_COLLECTION = "users";

export async function getCurrentUserProfile(): Promise<AppUser | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return null;
  }

  const userRef = doc(db, USERS_COLLECTION, currentUser.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  return { id: userSnap.id, ...userSnap.data() } as AppUser;
}

export async function getUserProfile(userId: string): Promise<AppUser | null> {
  const userRef = doc(db, USERS_COLLECTION, userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  return { id: userSnap.id, ...userSnap.data() } as AppUser;
}
