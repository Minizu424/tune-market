import type { Timestamp } from "firebase/firestore";

/** 投票の選択肢 */
export type PollOption = {
  id: string;
  label: string;
  /** この選択肢に投じられた票数（＝投票者の保有株数の合計） */
  voteWeight: number;
  /** この選択肢に投票した人数 */
  voterCount: number;
};

/**
 * 株主投票。
 * songs/{songId}/polls/{pollId} に保存する。
 * 楽曲の株主だけが投票でき、票の重みは保有株数に比例する。
 */
export type Poll = {
  id: string;
  songId: string;
  artistId: string;
  question: string;
  options: PollOption[];
  status: "open" | "closed";
  totalVoteWeight: number;
  totalVoterCount: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

/**
 * 投票用紙。songs/{songId}/polls/{pollId}/ballots/{userId} に保存する。
 * ドキュメントIDをユーザーIDにすることで二重投票を構造的に防ぐ。
 */
export type Ballot = {
  id: string;
  userId: string;
  optionId: string;
  /** 投票時点の保有株数 */
  weight: number;
  createdAt: Timestamp | null;
};
