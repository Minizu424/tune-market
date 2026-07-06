import type { Timestamp } from "firebase/firestore";

export type SongStatus = "draft" | "public" | "archived";

export type Song = {
  id: string;
  artistId: string;
  artistName: string;
  title: string;
  genre: string;
  description: string;
  audioUrl: string;
  jacketUrl: string;
  currentPrice: number;
  previousPrice: number;
  initialPrice: number;
  progress: number;
  status: SongStatus;
  playCount: number;
  likeCount: number;
  saveCount: number;
  commentCount: number;
  holderCount: number;
  supportPoint: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};