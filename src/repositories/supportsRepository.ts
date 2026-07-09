import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Support } from "@/types";

const SUPPORTS_COLLECTION = "supports";

export async function getUserSupports(
  userId: string,
  limitCount = 50,
): Promise<Support[]> {
  const supportsQuery = query(
    collection(db, SUPPORTS_COLLECTION),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(limitCount),
  );
  const snapshot = await getDocs(supportsQuery);

  return snapshot.docs.map((supportDoc) => ({
    id: supportDoc.id,
    ...supportDoc.data(),
  })) as Support[];
}

export async function getSupportsSince(since: Date): Promise<Support[]> {
  const supportsQuery = query(
    collection(db, SUPPORTS_COLLECTION),
    where("createdAt", ">=", Timestamp.fromDate(since)),
  );
  const snapshot = await getDocs(supportsQuery);

  return snapshot.docs.map((supportDoc) => ({
    id: supportDoc.id,
    ...supportDoc.data(),
  })) as Support[];
}
