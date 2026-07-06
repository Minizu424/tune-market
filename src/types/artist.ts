import type { Timestamp } from "firebase/firestore";

export type Artist = {
  id: string;
  userId: string;
  artistName: string;
  profile: string;
  genres: string[];
  snsLink: string;
  totalSupportPoint: number;
  weeklySupportPoint: number;
  followerCount: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};