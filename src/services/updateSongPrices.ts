import { doc, writeBatch, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getSongs } from "@/repositories/songsRepository";
import type { Song } from "@/types";

/**
 * 簡易株価計算式。
 * 再生数・いいね数・保存数・コメント数・保有者数を主な指標とし、
 * 応援ポイントは影響度を小さくして加える（要件定義 6.5）。
 */
export function calculateSongPrice(song: Song): number {
  const score =
    (song.playCount ?? 0) * 0.001 +
    (song.likeCount ?? 0) * 0.05 +
    (song.saveCount ?? 0) * 0.05 +
    (song.commentCount ?? 0) * 0.1 +
    (song.holderCount ?? 0) * 0.5 +
    (song.supportPoint ?? 0) * 0.01;

  return Math.max(1, Math.round((song.initialPrice ?? 100) + score));
}

/**
 * 全公開楽曲の株価を更新するバッチ処理（MVPでは手動実行）。
 * previousPrice に現在価格を退避し、priceHistories に履歴を残す。
 */
export async function updateSongPrices(): Promise<number> {
  const songs = await getSongs();
  const batch = writeBatch(db);

  for (const song of songs) {
    const newPrice = calculateSongPrice(song);

    batch.update(doc(db, "songs", song.id), {
      previousPrice: song.currentPrice,
      currentPrice: newPrice,
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(collection(db, "priceHistories")), {
      songId: song.id,
      price: newPrice,
      recordedAt: serverTimestamp(),
    });
  }

  await batch.commit();
  return songs.length;
}
