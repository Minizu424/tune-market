import { collection, doc, increment, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppUser } from "@/types";

export type SupportSongInput = {
  userId: string;
  songId: string;
  artistId: string;
  point: number;
};

export type SupportSongResult = {
  newPointBalance: number;
};

/**
 * 楽曲（とそのアーティスト）を応援する。
 * 1. ユーザーの pointBalance を減算する
 * 2. supports に応援履歴を保存する
 * 3. songs.supportPoint を加算する
 * 4. artists の weeklySupportPoint / totalSupportPoint を加算する
 */
export async function supportSong(
  input: SupportSongInput,
): Promise<SupportSongResult> {
  const { userId, songId, artistId, point } = input;

  if (point <= 0) {
    throw new Error("応援ポイントは1pt以上を指定してください。");
  }

  const userRef = doc(db, "users", userId);
  const songRef = doc(db, "songs", songId);
  const artistRef = artistId ? doc(db, "artists", artistId) : null;
  const supportRef = doc(collection(db, "supports"));

  return runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    const songSnap = await tx.get(songRef);
    const artistSnap = artistRef ? await tx.get(artistRef) : null;

    if (!userSnap.exists()) {
      throw new Error("ユーザー情報が見つかりません。");
    }
    if (!songSnap.exists()) {
      throw new Error("楽曲が見つかりません。");
    }

    const user = userSnap.data() as AppUser;

    if (user.pointBalance < point) {
      throw new Error("ポイント残高が不足しています。");
    }

    tx.update(userRef, {
      pointBalance: increment(-point),
      updatedAt: serverTimestamp(),
    });

    tx.update(songRef, {
      supportPoint: increment(point),
      updatedAt: serverTimestamp(),
    });

    if (artistRef && artistSnap?.exists()) {
      tx.update(artistRef, {
        totalSupportPoint: increment(point),
        weeklySupportPoint: increment(point),
        updatedAt: serverTimestamp(),
      });
    }

    tx.set(supportRef, {
      userId,
      songId,
      artistId,
      point,
      createdAt: serverTimestamp(),
    });

    return {
      newPointBalance: user.pointBalance - point,
    };
  });
}
