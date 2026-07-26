import { collection, doc, increment, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { executeTrade } from "@/lib/pricing";
import { buildHoldingId } from "@/repositories/holdingsRepository";
import type { AppUser, Holding, Song } from "@/types";

export type BuySongStockInput = {
  userId: string;
  songId: string;
  pointAmount: number;
};

export type BuySongStockResult = {
  quantity: number;
  newPointBalance: number;
  /** 平均約定価格（この価格で買った） */
  tradedPrice: number;
  /** 買う前の価格 */
  beforePrice: number;
  /** 買いによって上昇したあとの価格 */
  newPrice: number;
};

/**
 * 楽曲株を購入する。
 * 1. ユーザーの pointBalance を確認して減算する
 * 2. holdings を作成または更新する（端数購入に対応）
 * 3. transactions に buy 履歴を保存する
 * 4. 新規保有の場合は songs.holderCount を加算する
 * 5. 買い注文の需給インパクトで currentPrice を上昇させ、priceHistories に記録する
 */
export async function buySongStock(
  input: BuySongStockInput,
): Promise<BuySongStockResult> {
  const { userId, songId, pointAmount } = input;

  if (pointAmount <= 0) {
    throw new Error("購入ポイントは1pt以上を指定してください。");
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

    const user = userSnap.data() as AppUser;
    const song = songSnap.data() as Song;

    if (song.status !== "public") {
      throw new Error("公開されていない楽曲は購入できません。");
    }
    if (user.pointBalance < pointAmount) {
      throw new Error("ポイント残高が不足しています。");
    }
    if (song.currentPrice <= 0) {
      throw new Error("現在価格が不正です。");
    }

    // 価格を押し上げながら約定するため、約定価格は取引前後の平均になる
    const execution = executeTrade(song.currentPrice, pointAmount, "buy");
    const tradedPrice = execution.executionPrice;
    const newPrice = execution.afterPrice;
    const quantity = Number((pointAmount / tradedPrice).toFixed(4));
    const isNewHolder =
      !holdingSnap.exists() || (holdingSnap.data() as Holding).quantity <= 0;

    if (holdingSnap.exists()) {
      const holding = holdingSnap.data() as Holding;
      const newQuantity = Number((holding.quantity + quantity).toFixed(4));
      const totalCost = holding.quantity * holding.averagePrice + pointAmount;
      const newAveragePrice = Number((totalCost / newQuantity).toFixed(2));

      tx.update(holdingRef, {
        quantity: newQuantity,
        averagePrice: newAveragePrice,
        updatedAt: serverTimestamp(),
      });
    } else {
      tx.set(holdingRef, {
        userId,
        songId,
        quantity,
        averagePrice: tradedPrice,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    tx.update(userRef, {
      pointBalance: increment(-pointAmount),
      updatedAt: serverTimestamp(),
    });

    tx.update(songRef, {
      currentPrice: newPrice,
      ...(isNewHolder ? { holderCount: increment(1) } : {}),
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
      type: "buy",
      quantity,
      price: tradedPrice,
      totalPoint: pointAmount,
      createdAt: serverTimestamp(),
    });

    return {
      quantity,
      newPointBalance: user.pointBalance - pointAmount,
      tradedPrice,
      beforePrice: execution.beforePrice,
      newPrice,
    };
  });
}
