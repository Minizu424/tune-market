import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Ballot, Poll, PollOption } from "@/types";

/**
 * 株主投票は songs/{songId}/polls のサブコレクションに保存する。
 * サブコレクションなら orderBy(createdAt) に複合インデックスが要らない。
 */

export function pollsCollection(songId: string) {
  return collection(db, "songs", songId, "polls");
}

export function pollDoc(songId: string, pollId: string) {
  return doc(db, "songs", songId, "polls", pollId);
}

export function ballotDoc(songId: string, pollId: string, userId: string) {
  return doc(db, "songs", songId, "polls", pollId, "ballots", userId);
}

/** 楽曲の最新の投票を1件取得する（MVPでは1曲につき1つ表示する） */
export async function getLatestPoll(songId: string): Promise<Poll | null> {
  const snapshot = await getDocs(
    query(pollsCollection(songId), orderBy("createdAt", "desc"), limit(1)),
  );
  if (snapshot.empty) {
    return null;
  }
  const pollDocSnap = snapshot.docs[0];
  return { id: pollDocSnap.id, ...pollDocSnap.data() } as Poll;
}

/** 楽曲の投票を新しい順に取得する（アーティスト用） */
export async function getPolls(songId: string, limitCount = 10): Promise<Poll[]> {
  const snapshot = await getDocs(
    query(pollsCollection(songId), orderBy("createdAt", "desc"), limit(limitCount)),
  );
  return snapshot.docs.map((pollDocSnap) => ({
    id: pollDocSnap.id,
    ...pollDocSnap.data(),
  })) as Poll[];
}

/** 自分の投票内容を取得する（未投票なら null） */
export async function getMyBallot(
  songId: string,
  pollId: string,
  userId: string,
): Promise<Ballot | null> {
  const snapshot = await getDoc(ballotDoc(songId, pollId, userId));
  if (!snapshot.exists()) {
    return null;
  }
  return { id: snapshot.id, ...snapshot.data() } as Ballot;
}

export type CreatePollInput = {
  songId: string;
  artistId: string;
  question: string;
  optionLabels: string[];
};

/** 投票を作成する（アーティストのみ） */
export async function createPoll(input: CreatePollInput): Promise<string> {
  const { songId, artistId, question, optionLabels } = input;

  const labels = optionLabels.map((label) => label.trim()).filter(Boolean);
  if (!question.trim()) {
    throw new Error("質問を入力してください。");
  }
  if (labels.length < 2) {
    throw new Error("選択肢は2つ以上必要です。");
  }

  const options: PollOption[] = labels.map((label, index) => ({
    id: `option-${index + 1}`,
    label,
    voteWeight: 0,
    voterCount: 0,
  }));

  const newPollRef = doc(pollsCollection(songId));
  await setDoc(newPollRef, {
    songId,
    artistId,
    question: question.trim(),
    options,
    status: "open",
    totalVoteWeight: 0,
    totalVoterCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return newPollRef.id;
}
