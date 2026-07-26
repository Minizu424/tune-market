import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Holding } from "@/types";

const HOLDINGS_COLLECTION = "holdings";

export function buildHoldingId(userId: string, songId: string): string {
  return `${userId}_${songId}`;
}

/** 保有ドキュメントの参照を返す（トランザクション内で使う） */
export function getHoldingRef(userId: string, songId: string) {
  return doc(db, HOLDINGS_COLLECTION, buildHoldingId(userId, songId));
}

export async function getHolding(
  userId: string,
  songId: string,
): Promise<Holding | null> {
  const holdingRef = doc(db, HOLDINGS_COLLECTION, buildHoldingId(userId, songId));
  const holdingSnap = await getDoc(holdingRef);

  if (!holdingSnap.exists()) {
    return null;
  }

  return { id: holdingSnap.id, ...holdingSnap.data() } as Holding;
}

export async function getUserHoldings(userId: string): Promise<Holding[]> {
  const holdingsQuery = query(
    collection(db, HOLDINGS_COLLECTION),
    where("userId", "==", userId),
  );
  const snapshot = await getDocs(holdingsQuery);

  const holdings = snapshot.docs.map((holdingDoc) => ({
    id: holdingDoc.id,
    ...holdingDoc.data(),
  })) as Holding[];

  return holdings.filter((holding) => holding.quantity > 0);
}
