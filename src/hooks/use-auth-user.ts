import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { getUserProfile } from "@/repositories/usersRepository";
import type { AppUser } from "@/types";

/**
 * Firebase Auth のログイン状態と users ドキュメントをまとめて扱うフック。
 */
export function useAuthUser() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(auth.currentUser);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) {
      setProfile(null);
      return;
    }
    const nextProfile = await getUserProfile(current.uid);
    setProfile(nextProfile);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const nextProfile = await getUserProfile(user.uid);
          setProfile(nextProfile);
        } catch (error) {
          console.error(error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { firebaseUser, profile, loading, refreshProfile };
}
