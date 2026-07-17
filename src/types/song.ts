import type { Timestamp } from "firebase/firestore";

export type SongStatus = "draft" | "public" | "archived";

/** 前回の株価更新時点の統計値。増分ベースの価格計算に使う。 */
export type PricingSnapshot = {
  playCount: number;
  supportPoint: number;
  holderCount: number;
  totalPlaySeconds: number;
  likeCount: number;
  commentCount: number;
};

export type Song = {
  id: string;
  artistId: string;
  artistName: string;
  title: string;
  genre: string;
  /** アーティストが自由に付けられるタグ（最大5個） */
  tags?: string[];
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
  /** リール等での合計再生秒数 */
  totalPlaySeconds?: number;
  /** 前回株価更新時の統計スナップショット */
  pricingSnapshot?: PricingSnapshot | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};