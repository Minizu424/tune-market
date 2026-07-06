import type { Timestamp } from "firebase/firestore";

export type TransactionType = "buy" | "sell";

export type Transaction = {
  id: string;
  userId: string;
  songId: string;
  type: TransactionType;
  quantity: number;
  price: number;
  totalPoint: number;
  createdAt: Timestamp | null;
};