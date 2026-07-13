import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getSongs } from "@/repositories/songsRepository";
import type { PricingSnapshot, Song } from "@/types";

/**
 * 増分ベースの株価計算（要件定義 6.5）。
 *
 * 前回の株価更新以降に増えた「反応」だけを価格に反映する。
 * - 再生数の増分（リール・詳細画面での再生）
 * - 再生時間の増分（どれだけ長く聴かれたか）
 * - 保有者数の増減（購入・売却）
 * - 応援ポイントの増分（影響度は小さめにする）
 *
 * 反応がなかった曲は1%下落し、放置では価格が維持されない。
 * 1回の更新での変動は±30%までに制限する。
 */

const WEIGHTS = {
  playCount: 0.5, // 1再生ごと +0.5pt
  playSeconds: 0.05, // 再生1秒ごと +0.05pt
  holderCount: 2, // 保有者1人の増減で ±2pt
  supportPoint: 0.05, // 応援1ptごと +0.05pt（影響度小さめ）
} as const;

const NO_ACTIVITY_DECAY = 0.99; // 反応なしのとき1%下落
const MAX_CHANGE_RATE = 0.3; // 1回の変動幅の上限（±30%）

function currentStats(song: Song): PricingSnapshot {
  return {
    playCount: song.playCount ?? 0,
    supportPoint: song.supportPoint ?? 0,
    holderCount: song.holderCount ?? 0,
    totalPlaySeconds: song.totalPlaySeconds ?? 0,
  };
}

export function calculateSongPrice(song: Song): number {
  const stats = currentStats(song);
  // スナップショットがない曲（初回更新・既存データ）は現在値を基準にする
  const snapshot = song.pricingSnapshot ?? stats;

  const deltaPlay = Math.max(0, stats.playCount - snapshot.playCount);
  const deltaSeconds = Math.max(0, stats.totalPlaySeconds - snapshot.totalPlaySeconds);
  const deltaSupport = Math.max(0, stats.supportPoint - snapshot.supportPoint);
  const deltaHolder = stats.holderCount - snapshot.holderCount; // 売却で負にもなる

  const activityScore =
    deltaPlay * WEIGHTS.playCount +
    deltaSeconds * WEIGHTS.playSeconds +
    deltaSupport * WEIGHTS.supportPoint +
    deltaHolder * WEIGHTS.holderCount;

  const hasActivity =
    deltaPlay !== 0 || deltaSeconds !== 0 || deltaSupport !== 0 || deltaHolder !== 0;

  const rawPrice = hasActivity
    ? song.currentPrice + activityScore
    : song.currentPrice * NO_ACTIVITY_DECAY;

  // 1回の更新での変動を±30%に制限
  const upperLimit = song.currentPrice * (1 + MAX_CHANGE_RATE);
  const lowerLimit = song.currentPrice * (1 - MAX_CHANGE_RATE);
  const clamped = Math.min(upperLimit, Math.max(lowerLimit, rawPrice));

  return Math.max(1, Math.round(clamped));
}

/**
 * 全公開楽曲の株価を更新するバッチ処理（MVPでは手動実行）。
 * previousPrice に現在価格を退避し、priceHistories に履歴を残す。
 * 更新後の統計値を pricingSnapshot として保存し、次回の増分計算に使う。
 */
export async function updateSongPrices(): Promise<number> {
  const songs = await getSongs();
  const batch = writeBatch(db);

  for (const song of songs) {
    const newPrice = calculateSongPrice(song);

    batch.update(doc(db, "songs", song.id), {
      previousPrice: song.currentPrice,
      currentPrice: newPrice,
      pricingSnapshot: currentStats(song),
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
