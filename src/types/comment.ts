import type { Timestamp } from "firebase/firestore";

export type Comment = {
  id: string;
  songId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: Timestamp | null;
};
