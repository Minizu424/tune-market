import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Comment } from "@/types";

const COMMENTS_COLLECTION = "comments";

/** 楽曲のコメントを新しい順に取得する */
export async function getSongComments(
  songId: string,
  limitCount = 50,
): Promise<Comment[]> {
  const commentsQuery = query(
    collection(db, COMMENTS_COLLECTION),
    where("songId", "==", songId),
    orderBy("createdAt", "desc"),
    limit(limitCount),
  );
  const snapshot = await getDocs(commentsQuery);

  return snapshot.docs.map((commentDoc) => ({
    id: commentDoc.id,
    ...commentDoc.data(),
  })) as Comment[];
}
