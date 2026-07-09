import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Screen } from "@/components/ui/Screen";
import { Colors } from "@/constants/colors";
import { useAuthUser } from "@/hooks/use-auth-user";
import { getArtistByUserId } from "@/repositories/artistsRepository";
import { getProgressUpdates } from "@/repositories/progressUpdatesRepository";
import { getSongById } from "@/repositories/songsRepository";
import { updateSongProgress } from "@/services/updateSongProgress";
import type { Artist, ProgressUpdate, Song } from "@/types";

const STEP = 5;

export default function ProgressUpdateScreen() {
  const { songId } = useLocalSearchParams<{ songId: string }>();
  const { firebaseUser } = useAuthUser();

  const [song, setSong] = useState<Song | null>(null);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [history, setHistory] = useState<ProgressUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  const [progress, setProgress] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!songId || !firebaseUser) {
      return;
    }
    try {
      const [songData, artistData, updates] = await Promise.all([
        getSongById(songId),
        getArtistByUserId(firebaseUser.uid),
        getProgressUpdates(songId),
      ]);
      setSong(songData);
      setArtist(artistData);
      setHistory(updates);
      if (songData) {
        setProgress(songData.progress);
      }
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

  const handleUpdate = async () => {
    if (!song || !artist) {
      return;
    }

    setSubmitting(true);
    try {
      await updateSongProgress({
        songId: song.id,
        artistId: artist.id,
        progress,
        comment: comment.trim(),
      });
      Alert.alert("更新完了", "制作進捗を更新しました。ファンに成長が伝わります！");
      setComment("");
      await loadData();
    } catch (error) {
      console.error(error);
      Alert.alert("エラー", "進捗の更新に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Screen title="制作進捗更新">
        <ActivityIndicator color={Colors.accent} />
      </Screen>
    );
  }

  if (!song || !allowed) {
    return (
      <Screen title="制作進捗更新">
        <Text style={styles.errorText}>
          {song ? "この楽曲を更新する権限がありません。" : "楽曲が見つかりません。"}
        </Text>
        <AppButton title="戻る" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen title="制作進捗更新" subtitle={song.title}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← 戻る</Text>
      </Pressable>

      <AppCard style={styles.card}>
        <Text style={styles.cardTitle}>制作の進捗：{progress}%</Text>
        <ProgressBar progress={progress} showLabel={false} />
        <View style={styles.stepper}>
          <Pressable
            style={styles.stepButton}
            onPress={() => setProgress((prev) => Math.max(0, prev - STEP))}
          >
            <Text style={styles.stepText}>−{STEP}%</Text>
          </Pressable>
          <Pressable
            style={styles.stepButton}
            onPress={() => setProgress((prev) => Math.min(100, prev + STEP))}
          >
            <Text style={styles.stepText}>＋{STEP}%</Text>
          </Pressable>
          <Pressable style={styles.stepButton} onPress={() => setProgress(100)}>
            <Text style={styles.stepText}>完成!</Text>
          </Pressable>
        </View>
      </AppCard>

      <Text style={styles.label}>進捗コメント</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={comment}
        onChangeText={setComment}
        placeholder="例：メロディをブラッシュアップしました。次はミックスを調整します！"
        placeholderTextColor={Colors.textFaint}
        multiline
        numberOfLines={3}
      />

      <AppButton
        title={submitting ? "更新中..." : "進捗を更新する"}
        onPress={handleUpdate}
        disabled={submitting}
        style={styles.submit}
      />

      <Text style={styles.sectionTitle}>進捗履歴</Text>
      {history.length === 0 ? (
        <Text style={styles.errorText}>まだ進捗の更新履歴はありません。</Text>
      ) : (
        history.map((update) => (
          <AppCard key={update.id} style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyProgress}>{update.progress}%</Text>
              <Text style={styles.historyDate}>
                {update.createdAt
                  ? update.createdAt.toDate().toLocaleDateString("ja-JP")
                  : ""}
              </Text>
            </View>
            {update.comment ? (
              <Text style={styles.historyComment}>{update.comment}</Text>
            ) : null}
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
  card: {
    marginBottom: 8,
  },
  cardTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 12,
  },
  stepper: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  stepButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.input,
    paddingVertical: 10,
    alignItems: "center",
  },
  stepText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  label: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    backgroundColor: Colors.input,
    color: Colors.text,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: "top",
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
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  historyProgress: {
    color: Colors.accentSoft,
    fontSize: 14,
    fontWeight: "800",
  },
  historyDate: {
    color: Colors.textFaint,
    fontSize: 11,
  },
  historyComment: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});
