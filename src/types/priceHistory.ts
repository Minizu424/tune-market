import type { Timestamp } from "firebase/firestore";

export type PriceHistory = {
  id: string;
  songId: string;
  price: number;
  recordedAt: Timestamp | null;
};
