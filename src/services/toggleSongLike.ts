import { doc, increment, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { buildLikeId } from "@/repositories/likesRepository";

export type ToggleSongLikeResult = {
  liked: boolean;
};

/**
 * 楽曲のいいねをトグルする。
 * - 未いいね → likes に保存し songs.likeCount を +1
 * - いいね済み → likes から削除し songs.likeCount を -1
 * いいね数は株価更新（updateSongPrices）で価格に反映される。
 */
export async function toggleSongLike(
  userId: string,
  songId: string,
): Promise<ToggleSongLikeResult> {
  const likeRef = doc(db, "likes", buildLikeId(userId, songId));
  const songRef = doc(db, "songs", songId);

  return runTransaction(db, async (tx) => {
    const [likeSnap, songSnap] = await Promise.all([
      tx.get(likeRef),
      tx.get(songRef),
    ]);

    if (!songSnap.exists()) {
      throw new Error("楽曲が見つかりません。");
    }

    if (likeSnap.exists()) {
      tx.delete(likeRef);
      tx.update(songRef, { likeCount: increment(-1) });
      return { liked: false };
    }

    tx.set(likeRef, {
      userId,
      songId,
      createdAt: serverTimestamp(),
    });
    tx.update(songRef, { likeCount: increment(1) });
    return { liked: true };
  });
}
