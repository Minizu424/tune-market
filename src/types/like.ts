import type { Timestamp } from "firebase/firestore";

export type Like = {
  id: string;
  userId: string;
  songId: string;
  createdAt: Timestamp | null;
};
