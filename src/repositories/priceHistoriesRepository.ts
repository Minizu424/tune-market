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

export async function getPriceHistories(
  songId: string,
  limitCount = 60,
): Promise<PriceHistory[]> {
  const historiesQuery = query(
    collection(db, PRICE_HISTORIES_COLLECTION),
    where("songId", "==", songId),
    orderBy("recordedAt", "asc"),
    limit(limitCount),
  );
  const snapshot = await getDocs(historiesQuery);

  return snapshot.docs.map((historyDoc) => ({
    id: historyDoc.id,
    ...historyDoc.data(),
  })) as PriceHistory[];
}

export async function addPriceHistory(songId: string, price: number): Promise<void> {
  await addDoc(collection(db, PRICE_HISTORIES_COLLECTION), {
    songId,
    price,
    recordedAt: serverTimestamp(),
  });
}
