import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { AppCard } from "@/components/ui/AppCard";
import { Colors } from "@/constants/colors";
import { formatQuantity } from "@/lib/format";
import { getLatestPoll, getMyBallot } from "@/repositories/pollsRepository";
import { voteOnPoll } from "@/services/voteOnPoll";
import type { Poll } from "@/types";

type PollCardProps = {
  songId: string;
  userId: string | null;
  /** この楽曲の保有株数。0なら投票できない。 */
  holdingQuantity: number;
};

/**
 * 株主投票カード。
 *
 * 楽曲の株主だけが投票でき、票の重みは保有株数に比例する。
 * 「株を持つと制作に関われる」という株主特典の中核。
 */
export function PollCard({ songId, userId, holdingQuantity }: PollCardProps) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const latest = await getLatestPoll(songId);
      setPoll(latest);

      if (latest && userId) {
        const ballot = await getMyBallot(songId, latest.id, userId);
        setSelectedOptionId(ballot?.optionId ?? null);
      } else {
        setSelectedOptionId(null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [songId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleVote = useCallback(
    async (optionId: string) => {
      if (!userId || !poll || submitting) {
        return;
      }
      if (holdingQuantity <= 0) {
        setMessage("この楽曲の株を持つと投票できます。");
        return;
      }

      setSubmitting(true);
      setMessage(null);
      try {
        const result = await voteOnPoll({
          songId,
          pollId: poll.id,
          userId,
          optionId,
        });
        setPoll(result.poll);
        setSelectedOptionId(optionId);
        setMessage(`${formatQuantity(result.weight)}分の票を投じました。`);
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "投票に失敗しました。",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [userId, poll, submitting, holdingQuantity, songId],
  );

  if (loading) {
    return (
      <AppCard style={styles.card}>
        <ActivityIndicator color={Colors.accent} />
      </AppCard>
    );
  }

  if (!poll) {
    return null;
  }

  const canVote = Boolean(userId) && holdingQuantity > 0 && poll.status === "open";
  const totalWeight = poll.totalVoteWeight || 0;

  return (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.badge}>株主投票</Text>
        {poll.status === "closed" && <Text style={styles.closed}>締切済み</Text>}
      </View>

      <Text style={styles.question}>{poll.question}</Text>

      <Text style={styles.rule}>
        {canVote
          ? `あなたの票数は保有株数ぶん（${formatQuantity(holdingQuantity)}）です`
          : "この楽曲の株を持つと投票できます"}
      </Text>

      <View style={styles.options}>
        {poll.options.map((option) => {
          const ratio =
            totalWeight > 0 ? (option.voteWeight / totalWeight) * 100 : 0;
          const selected = selectedOptionId === option.id;

          return (
            <Pressable
              key={option.id}
              onPress={() => handleVote(option.id)}
              disabled={!canVote || submitting}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <View style={[styles.optionFill, { width: `${ratio}%` }]} />
              <View style={styles.optionContent}>
                <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                  {selected ? "✓ " : ""}
                  {option.label}
                </Text>
                <Text style={styles.optionRatio}>{ratio.toFixed(0)}%</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.summary}>
        {poll.totalVoterCount}人が投票 ／ 合計 {formatQuantity(totalWeight)}
      </Text>

      {message && <Text style={styles.message}>{message}</Text>}

      <Text style={styles.disclaimer}>
        ※この投票は制作方針への意見表明であり、金融商品としての議決権や所有権ではありません。
      </Text>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  badge: {
    color: Colors.onGold,
    backgroundColor: "#FAEEDA",
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  closed: {
    color: Colors.textFaint,
    fontSize: 11,
    fontWeight: "700",
  },
  question: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 23,
    marginBottom: 6,
  },
  rule: {
    color: Colors.textMuted,
    fontSize: 12,
    marginBottom: 14,
  },
  options: {
    gap: 10,
  },
  option: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.background,
    overflow: "hidden",
  },
  optionSelected: {
    borderColor: Colors.accent,
  },
  optionFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(17, 17, 19, 0.07)",
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  optionLabel: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
  },
  optionLabelSelected: {
    color: Colors.accentSoft,
  },
  optionRatio: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 12,
  },
  summary: {
    color: Colors.textFaint,
    fontSize: 12,
    marginTop: 12,
  },
  message: {
    color: Colors.accentSoft,
    fontSize: 13,
    marginTop: 8,
  },
  disclaimer: {
    color: Colors.textFaint,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 10,
  },
});
