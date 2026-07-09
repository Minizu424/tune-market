import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Transaction } from "@/types";

const TRANSACTIONS_COLLECTION = "transactions";

export async function getUserTransactions(
  userId: string,
  limitCount = 50,
): Promise<Transaction[]> {
  const transactionsQuery = query(
    collection(db, TRANSACTIONS_COLLECTION),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(limitCount),
  );
  const snapshot = await getDocs(transactionsQuery);

  return snapshot.docs.map((transactionDoc) => ({
    id: transactionDoc.id,
    ...transactionDoc.data(),
  })) as Transaction[];
}
