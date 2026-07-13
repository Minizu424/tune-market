import {
  collection,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Comment } from "@/types";

const COMMENTS_COLLECTION = "comments";

/**
 * 楽曲のコメントを新しい順に取得する。
 * where + orderBy の複合インデックスを避けるため、並び替えはクライアント側で行う。
 */
export async function getSongComments(
  songId: string,
  limitCount = 50,
): Promise<Comment[]> {
  const commentsQuery = query(
    collection(db, COMMENTS_COLLECTION),
    where("songId", "==", songId),
    limit(limitCount),
  );
  const snapshot = await getDocs(commentsQuery);

  const comments = snapshot.docs.map((commentDoc) => ({
    id: commentDoc.id,
    ...commentDoc.data(),
  })) as Comment[];

  return comments.sort(
    (a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
  );
}
