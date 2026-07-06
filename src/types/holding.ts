import type { Timestamp } from "firebase/firestore";

export type Holding = {
  id: string;
  userId: string;
  songId: string;
  quantity: number;
  averagePrice: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};