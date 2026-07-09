import type { Timestamp } from "firebase/firestore";

export type ProgressUpdate = {
  id: string;
  songId: string;
  artistId: string;
  progress: number;
  comment: string;
  createdAt: Timestamp | null;
};
