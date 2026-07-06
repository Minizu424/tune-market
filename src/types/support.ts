import type { Timestamp } from "firebase/firestore";

export type Support = {
  id: string;
  userId: string;
  artistId: string;
  songId: string;
  point: number;
  createdAt: Timestamp | null;
};