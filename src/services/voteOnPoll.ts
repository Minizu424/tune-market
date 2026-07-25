import { runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getHoldingRef } from "@/repositories/holdingsRepository";
import { ballotDoc, pollDoc } from "@/repositories/pollsRepository";
import type { Holding, Poll } from "@/types";

export type VoteOnPollInput = {
  songId: string;
  pollId: string;
  userId: string;
  optionId: string;
};

export type VoteOnPollResult = {
  /** 投じた票数（＝保有株数） */
  weight: number;
  poll: Poll;
};

/**
 * 株主投票に投票する。
 *
 * - 楽曲の株を保有している人だけが投票できる
 * - 票の重みは保有株数に比例する（保有が多いほど発言力が大きい）
 * - 投票用紙のドキュメントIDをユーザーIDにすることで二重投票を防ぐ
 * - 投票済みでも選択肢の変更はできる（前の票を差し引いてから加算する）
 *
 * ※ここでいう議決権は「制作方針への意見表明」であり、
 *   金融商品としての議決権や所有権ではない。
 */
export async function voteOnPoll(
  input: VoteOnPollInput,
): Promise<VoteOnPollResult> {
  const { songId, pollId, userId, optionId } = input;

  const targetPollRef = pollDoc(songId, pollId);
  const targetBallotRef = ballotDoc(songId, pollId, userId);
  const holdingRef = getHoldingRef(userId, songId);

  return runTransaction(db, async (tx) => {
    const [pollSnap, ballotSnap, holdingSnap] = await Promise.all([
      tx.get(targetPollRef),
      tx.get(targetBallotRef),
      tx.get(holdingRef),
    ]);

    if (!pollSnap.exists()) {
      throw new Error("投票が見つかりません。");
    }

    const poll = { id: pollSnap.id, ...pollSnap.data() } as Poll;

    if (poll.status !== "open") {
      throw new Error("この投票は締め切られています。");
    }

    const holding = holdingSnap.exists()
      ? (holdingSnap.data() as Holding)
      : null;
    const weight = Number((holding?.quantity ?? 0).toFixed(4));

    if (weight <= 0) {
      throw new Error("この楽曲の株主だけが投票できます。");
    }

    if (!poll.options.some((option) => option.id === optionId)) {
      throw new Error("選択肢が不正です。");
    }

    const previous = ballotSnap.exists()
      ? (ballotSnap.data() as { optionId: string; weight: number })
      : null;

    if (previous?.optionId === optionId && previous.weight === weight) {
      return { weight, poll };
    }

    // 選択肢ごとの集計を作り直す（前回の票を取り消してから今回の票を加える）
    const nextOptions = poll.options.map((option) => {
      let voteWeight = option.voteWeight ?? 0;
      let voterCount = option.voterCount ?? 0;

      if (previous && previous.optionId === option.id) {
        voteWeight -= previous.weight;
        voterCount -= 1;
      }
      if (option.id === optionId) {
        voteWeight += weight;
        voterCount += 1;
      }

      return {
        ...option,
        voteWeight: Math.max(0, Number(voteWeight.toFixed(4))),
        voterCount: Math.max(0, voterCount),
      };
    });

    const totalVoteWeight = Number(
      nextOptions.reduce((sum, option) => sum + option.voteWeight, 0).toFixed(4),
    );
    const totalVoterCount = nextOptions.reduce(
      (sum, option) => sum + option.voterCount,
      0,
    );

    tx.update(targetPollRef, {
      options: nextOptions,
      totalVoteWeight,
      totalVoterCount,
      updatedAt: serverTimestamp(),
    });

    tx.set(targetBallotRef, {
      userId,
      optionId,
      weight,
      createdAt: serverTimestamp(),
    });

    return {
      weight,
      poll: { ...poll, options: nextOptions, totalVoteWeight, totalVoterCount },
    };
  });
}
