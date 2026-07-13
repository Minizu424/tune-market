import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Like } from "@/types";

const LIKES_COLLECTION = "likes";

export function buildLikeId(userId: string, songId: string): string {
  return `${userId}_${songId}`;
}

/** ユーザーがその楽曲をいいね済みか */
export async function getLike(userId: string, songId: string): Promise<Like | null> {
  const likeRef = doc(db, LIKES_COLLECTION, buildLikeId(userId, songId));
  const likeSnap = await getDoc(likeRef);

  if (!likeSnap.exists()) {
    return null;
  }

  return { id: likeSnap.id, ...likeSnap.data() } as Like;
}

/** ユーザーがいいねした楽曲IDの集合を返す（リールのハート表示用） */
export async function getLikedSongIds(userId: string): Promise<Set<string>> {
  const likesQuery = query(
    collection(db, LIKES_COLLECTION),
    where("userId", "==", userId),
  );
  const snapshot = await getDocs(likesQuery);

  return new Set(snapshot.docs.map((likeDoc) => (likeDoc.data() as Like).songId));
}
