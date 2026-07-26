import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PriceHistory } from "@/types";

const PRICE_HISTORIES_COLLECTION = "priceHistories";

function toHistories(docs: { id: string; data: () => unknown }[]): PriceHistory[] {
  return docs.map((historyDoc) => ({
    id: historyDoc.id,
    ...(historyDoc.data() as object),
  })) as PriceHistory[];
}

function sortByRecordedAtAsc(histories: PriceHistory[]): PriceHistory[] {
  return histories
    .slice()
    .sort(
      (a, b) =>
        (a.recordedAt?.toMillis?.() ?? 0) - (b.recordedAt?.toMillis?.() ?? 0),
    );
}

/**
 * 直近 limitCount 件の価格履歴を「古い順」で返す。
 *
 * 注意: Firestore の limit はクエリ順の先頭から取るため、
 * asc + limit にすると最古の N 件しか取れず、新しい価格が永久にチャートに出ない。
 * そのため desc で取得してから反転させる。
 *
 * desc 版は (songId ASC, recordedAt DESC) の複合インデックスを必要とする。
 * 未作成の環境でも画面が壊れないよう、失敗したら並び替えなしで取得して
 * クライアント側でソートするフォールバックを用意している。
 * （firestore.indexes.json をデプロイすればこのフォールバックは使われない）
 */
export async function getPriceHistories(
  songId: string,
  limitCount = 60,
): Promise<PriceHistory[]> {
  try {
    const historiesQuery = query(
      collection(db, PRICE_HISTORIES_COLLECTION),
      where("songId", "==", songId),
      orderBy("recordedAt", "desc"),
      limit(limitCount),
    );
    const snapshot = await getDocs(historiesQuery);
    return toHistories(snapshot.docs).reverse();
  } catch (error) {
    console.warn(
      "priceHistories の複合インデックスが未作成のためフォールバックします:",
      error,
    );
    const fallbackQuery = query(
      collection(db, PRICE_HISTORIES_COLLECTION),
      where("songId", "==", songId),
    );
    const snapshot = await getDocs(fallbackQuery);
    return sortByRecordedAtAsc(toHistories(snapshot.docs)).slice(-limitCount);
  }
}

export async function addPriceHistory(songId: string, price: number): Promise<void> {
  await addDoc(collection(db, PRICE_HISTORIES_COLLECTION), {
    songId,
    price,
    recordedAt: serverTimestamp(),
  });
}
