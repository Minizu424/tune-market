import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { Screen } from "@/components/ui/Screen";
import { Colors } from "@/constants/colors";
import { useAuthUser } from "@/hooks/use-auth-user";
import { formatQuantity } from "@/lib/format";
import { notify } from "@/lib/notify";
import { getArtistByUserId } from "@/repositories/artistsRepository";
import { createPoll, getPolls } from "@/repositories/pollsRepository";
import { getSongById } from "@/repositories/songsRepository";
import type { Artist, Poll, Song } from "@/types";

const MAX_OPTIONS = 4;

const TEMPLATES = [
  {
    question: "次のジャケット、どっちがいい？",
    options: ["夜の街バージョン", "海バージョン"],
  },
  {
    question: "次に作る曲のジャンルは？",
    options: ["Lo-fi", "ロック", "EDM"],
  },
  {
    question: "この曲、どこを直してほしい？",
    options: ["サビをもっと派手に", "ボーカルを前に", "今のままで完成させる"],
  },
];

/**
 * 株主投票の作成画面（アーティスト用）。
 *
 * 壁紙やボイスメッセージと違い、設問を1つ作るだけで成立するので
 * アーティストの継続負担がほとんどない。
 */
export default function PollCreateScreen() {
  const { songId } = useLocalSearchParams<{ songId: string }>();
  const { firebaseUser } = useAuthUser();

  const [song, setSong] = useState<Song | null>(null);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!songId || !firebaseUser) {
      return;
    }
    try {
      const [songData, artistData, pollList] = await Promise.all([
        getSongById(songId),
        getArtistByUserId(firebaseUser.uid),
        getPolls(songId),
      ]);
      setSong(songData);
      setArtist(artistData);
      setPolls(pollList);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [songId, firebaseUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const allowed = Boolean(song && artist && song.artistId === artist.id);

  const applyTemplate = (index: number) => {
    const template = TEMPLATES[index];
    setQuestion(template.question);
    setOptions([...template.options]);
  };

  const updateOption = (index: number, value: string) => {
    setOptions((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const handleCreate = async () => {
    if (!song || !artist) {
      return;
    }

    setSubmitting(true);
    try {
      await createPoll({
        songId: song.id,
        artistId: artist.id,
        question,
        optionLabels: options,
      });
      notify("作成しました", "株主が楽曲ページから投票できるようになりました。");
      setQuestion("");
      setOptions(["", ""]);
      await loadData();
    } catch (error) {
      notify(
        "エラー",
        error instanceof Error ? error.message : "投票の作成に失敗しました。",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Screen title="株主投票">
        <ActivityIndicator color={Colors.accent} />
      </Screen>
    );
  }

  if (!song || !allowed) {
    return (
      <Screen title="株主投票">
        <Text style={styles.errorText}>
          {song ? "この楽曲を編集する権限がありません。" : "楽曲が見つかりません。"}
        </Text>
        <AppButton title="戻る" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen title="株主投票" subtitle={song.title}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← 戻る</Text>
      </Pressable>

      <Text style={styles.lead}>
        株を持っているファンだけが投票できます。票の重みは保有株数に比例します。
      </Text>

      <Text style={styles.label}>テンプレートから作る</Text>
      <View style={styles.templates}>
        {TEMPLATES.map((template, index) => (
          <Pressable
            key={template.question}
            style={styles.template}
            onPress={() => applyTemplate(index)}
          >
            <Text style={styles.templateText}>{template.question}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>質問</Text>
      <TextInput
        style={styles.input}
        value={question}
        onChangeText={setQuestion}
        placeholder="例：次のジャケット、どっちがいい？"
        placeholderTextColor={Colors.textFaint}
      />

      <Text style={styles.label}>選択肢</Text>
      {options.map((option, index) => (
        <TextInput
          key={index}
          style={[styles.input, styles.optionInput]}
          value={option}
          onChangeText={(value) => updateOption(index, value)}
          placeholder={`選択肢 ${index + 1}`}
          placeholderTextColor={Colors.textFaint}
        />
      ))}

      {options.length < MAX_OPTIONS && (
        <Pressable
          style={styles.addOption}
          onPress={() => setOptions((prev) => [...prev, ""])}
        >
          <Text style={styles.addOptionText}>＋ 選択肢を追加</Text>
        </Pressable>
      )}

      <AppButton
        title={submitting ? "作成中..." : "投票を作成する"}
        onPress={handleCreate}
        disabled={submitting}
        style={styles.submit}
      />

      <Text style={styles.sectionTitle}>これまでの投票</Text>
      {polls.length === 0 ? (
        <Text style={styles.errorText}>まだ投票を作成していません。</Text>
      ) : (
        polls.map((poll) => (
          <AppCard key={poll.id} style={styles.historyCard}>
            <Text style={styles.historyQuestion}>{poll.question}</Text>
            {poll.options.map((option) => {
              const ratio =
                poll.totalVoteWeight > 0
                  ? (option.voteWeight / poll.totalVoteWeight) * 100
                  : 0;
              return (
                <View key={option.id} style={styles.historyRow}>
                  <Text style={styles.historyLabel}>{option.label}</Text>
                  <Text style={styles.historyValue}>
                    {ratio.toFixed(0)}%（{option.voterCount}人）
                  </Text>
                </View>
              );
            })}
            <Text style={styles.historyMeta}>
              合計 {formatQuantity(poll.totalVoteWeight)} ／ {poll.totalVoterCount}人
            </Text>
          </AppCard>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    marginBottom: 8,
  },
  backText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  lead: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 14,
  },
  templates: {
    gap: 8,
  },
  template: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.card,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  templateText: {
    color: Colors.accentSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    backgroundColor: Colors.input,
    color: Colors.text,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
  },
  optionInput: {
    marginBottom: 8,
  },
  addOption: {
    paddingVertical: 8,
  },
  addOptionText: {
    color: Colors.accentSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  submit: {
    marginTop: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    color: Colors.accentSoft,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 10,
  },
  historyCard: {
    marginBottom: 8,
  },
  historyQuestion: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  historyLabel: {
    color: Colors.textMuted,
    fontSize: 13,
    flexShrink: 1,
  },
  historyValue: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 12,
  },
  historyMeta: {
    color: Colors.textFaint,
    fontSize: 11,
    marginTop: 6,
  },
  errorText: {
    color: Colors.textFaint,
    fontSize: 13,
    marginBottom: 12,
  },
});
