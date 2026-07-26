import { collection, doc, increment, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { executeTrade } from "@/lib/pricing";
import { buildHoldingId } from "@/repositories/holdingsRepository";
import type { AppUser, Holding, Song } from "@/types";

export type SellSongStockInput = {
  userId: string;
  songId: string;
  quantity: number;
};

export type SellSongStockResult = {
  proceeds: number;
  newPointBalance: number;
  /** 平均約定価格（この価格で売った） */
  tradedPrice: number;
  /** 売る前の価格 */
  beforePrice: number;
  /** 売りによって下落したあとの価格 */
  newPrice: number;
};

const QUANTITY_EPSILON = 0.0001;

/**
 * 楽曲株を売却する。
 * 1. 保有株数の範囲内かを確認する
 * 2. 現在価格をもとに売却額を計算して pointBalance に加算する
 * 3. holdings を更新する（0株になっても履歴として残す）
 * 4. transactions に sell 履歴を保存する
 * 5. 売り注文の需給インパクトで currentPrice を下落させ、priceHistories に記録する
 */
export async function sellSongStock(
  input: SellSongStockInput,
): Promise<SellSongStockResult> {
  const { userId, songId, quantity } = input;

  if (quantity <= 0) {
    throw new Error("売却株数は0より大きい値を指定してください。");
  }

  const userRef = doc(db, "users", userId);
  const songRef = doc(db, "songs", songId);
  const holdingRef = doc(db, "holdings", buildHoldingId(userId, songId));
  const transactionRef = doc(collection(db, "transactions"));
  const priceHistoryRef = doc(collection(db, "priceHistories"));

  return runTransaction(db, async (tx) => {
    const [userSnap, songSnap, holdingSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(songRef),
      tx.get(holdingRef),
    ]);

    if (!userSnap.exists()) {
      throw new Error("ユーザー情報が見つかりません。");
    }
    if (!songSnap.exists()) {
      throw new Error("楽曲が見つかりません。");
    }
    if (!holdingSnap.exists()) {
      throw new Error("この楽曲の株を保有していません。");
    }

    const user = userSnap.data() as AppUser;
    const song = songSnap.data() as Song;
    const holding = holdingSnap.data() as Holding;

    if (quantity > holding.quantity + QUANTITY_EPSILON) {
      throw new Error("保有株数を超えて売却することはできません。");
    }

    // 取引規模は「取引前価格での概算売却額」で測り、約定価格は取引前後の平均にする
    const notional = quantity * song.currentPrice;
    const execution = executeTrade(song.currentPrice, notional, "sell");
    const tradedPrice = execution.executionPrice;
    const newPrice = execution.afterPrice;
    const proceeds = Number((quantity * tradedPrice).toFixed(2));
    const rawRemaining = holding.quantity - quantity;
    const remaining =
      rawRemaining < QUANTITY_EPSILON ? 0 : Number(rawRemaining.toFixed(4));

    tx.update(holdingRef, {
      quantity: remaining,
      updatedAt: serverTimestamp(),
    });

    tx.update(userRef, {
      pointBalance: increment(proceeds),
      updatedAt: serverTimestamp(),
    });

    tx.update(songRef, {
      currentPrice: newPrice,
      ...(remaining === 0 ? { holderCount: increment(-1) } : {}),
      updatedAt: serverTimestamp(),
    });

    tx.set(priceHistoryRef, {
      songId,
      price: newPrice,
      source: "trade",
      recordedAt: serverTimestamp(),
    });

    tx.set(transactionRef, {
      userId,
      songId,
      type: "sell",
      quantity,
      price: tradedPrice,
      totalPoint: proceeds,
      createdAt: serverTimestamp(),
    });

    return {
      proceeds,
      newPointBalance: user.pointBalance + proceeds,
      tradedPrice,
      beforePrice: execution.beforePrice,
      newPrice,
    };
  });
}
