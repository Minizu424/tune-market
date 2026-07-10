import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppButton } from "@/components/ui/AppButton";
import { Screen } from "@/components/ui/Screen";
import { Colors } from "@/constants/colors";
import { GENRES } from "@/constants/genres";
import { useAuthUser } from "@/hooks/use-auth-user";
import { getArtistByUserId } from "@/repositories/artistsRepository";
import { createSong } from "@/repositories/songsRepository";
import type { Artist, SongStatus } from "@/types";

const INITIAL_PRICE = 100;
const PROGRESS_PRESETS = [0, 25, 50, 75, 100];

/**
 * 楽曲投稿画面。
 * MVPでは Firebase Storage を使わず、音源・ジャケット画像は
 * 外部URLを文字列として Firestore に保存する（URL方式）。
 */
export default function NewSongScreen() {
  const { firebaseUser } = useAuthUser();
  const [artist, setArtist] = useState<Artist | null>(null);

  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState<string>(GENRES[0]);
  const [description, setDescription] = useState("");
  const [progress, setProgress] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [jacketUrl, setJacketUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!firebaseUser) {
      return;
    }
    getArtistByUserId(firebaseUser.uid).then(setArtist).catch(console.error);
  }, [firebaseUser]);

  const validateUrl = (value: string): boolean => {
    if (!value.trim()) {
      return true; // 空はOK（任意項目）
    }
    return /^https?:\/\/.+/.test(value.trim());
  };

  const handleSubmit = async (status: SongStatus) => {
    if (!artist) {
      Alert.alert("エラー", "先にアーティスト登録をしてください。");
      return;
    }
    if (!title.trim()) {
      Alert.alert("エラー", "楽曲タイトルを入力してください。");
      return;
    }
    if (!validateUrl(audioUrl) || !validateUrl(jacketUrl)) {
      Alert.alert("エラー", "URLは http:// または https:// で始まる形式で入力してください。");
      return;
    }

    setSubmitting(true);
    try {
      await createSong({
        artistId: artist.id,
        artistName: artist.artistName,
        title: title.trim(),
        genre,
        description: description.trim(),
        audioUrl: audioUrl.trim(),
        jacketUrl: jacketUrl.trim(),
        initialPrice: INITIAL_PRICE,
        progress,
        status,
      });

      Alert.alert(
        "投稿完了",
        status === "public"
          ? `${title.trim()} を上場しました！初期価格は${INITIAL_PRICE}ptです。`
          : "下書きとして保存しました。",
      );
      router.replace("/artist/dashboard");
    } catch (error) {
      console.error(error);
      Alert.alert("エラー", "投稿に失敗しました。通信環境を確認してください。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen title="楽曲投稿" subtitle="制作中の楽曲も投稿できます。">
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← 戻る</Text>
      </Pressable>

      <Text style={styles.label}>楽曲タイトル</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="例：City Lights (Demo)"
        placeholderTextColor={Colors.textFaint}
      />

      <Text style={styles.label}>ジャンル</Text>
      <View style={styles.genres}>
        {GENRES.map((item) => (
          <Pressable
            key={item}
            style={[styles.genreChip, genre === item && styles.genreChipActive]}
            onPress={() => setGenre(item)}
          >
            <Text style={[styles.genreText, genre === item && styles.genreTextActive]}>
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>楽曲の説明</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="どんな楽曲か、制作の想いを書きましょう"
        placeholderTextColor={Colors.textFaint}
        multiline
        numberOfLines={4}
      />

      <Text style={styles.label}>制作の進捗：{progress}%</Text>
      <View style={styles.progressPresets}>
        {PROGRESS_PRESETS.map((preset) => (
          <Pressable
            key={preset}
            style={[styles.progressChip, progress === preset && styles.genreChipActive]}
            onPress={() => setProgress(preset)}
          >
            <Text
              style={[styles.genreText, progress === preset && styles.genreTextActive]}
            >
              {preset}%
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>音源URL（任意）</Text>
      <TextInput
        style={styles.input}
        value={audioUrl}
        onChangeText={setAudioUrl}
        placeholder="https://example.com/song.mp3"
        placeholderTextColor={Colors.textFaint}
        autoCapitalize="none"
        keyboardType="url"
      />

      <Text style={styles.label}>ジャケット画像URL（任意）</Text>
      <TextInput
        style={styles.input}
        value={jacketUrl}
        onChangeText={setJacketUrl}
        placeholder="https://example.com/jacket.png"
        placeholderTextColor={Colors.textFaint}
        autoCapitalize="none"
        keyboardType="url"
      />
      <Text style={styles.hint}>
        ※MVPではファイルアップロードは行わず、公開されているURLを登録します
      </Text>

      <Text style={styles.label}>初期価格（応援ポイント）</Text>
      <View style={styles.priceBox}>
        <Text style={styles.priceText}>{INITIAL_PRICE} pt（固定）</Text>
      </View>

      <AppButton
        title={submitting ? "投稿中..." : "投稿する"}
        onPress={() => handleSubmit("public")}
        disabled={submitting}
        style={styles.submit}
      />
      <AppButton
        title="下書きとして保存"
        variant="ghost"
        onPress={() => handleSubmit("draft")}
        disabled={submitting}
      />
      <Text style={styles.note}>投稿後はダッシュボードで管理できます</Text>
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
  label: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: Colors.input,
    color: Colors.text,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  genres: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  genreChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.card,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  genreChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  genreText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  genreTextActive: {
    color: Colors.text,
  },
  progressPresets: {
    flexDirection: "row",
    gap: 8,
  },
  progressChip: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.card,
    paddingVertical: 8,
    alignItems: "center",
  },
  hint: {
    color: Colors.textFaint,
    fontSize: 11,
    marginTop: 8,
  },
  priceBox: {
    backgroundColor: Colors.card,
    borderColor: Colors.cardBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  priceText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  submit: {
    marginTop: 24,
    marginBottom: 4,
  },
  note: {
    color: Colors.textFaint,
    fontSize: 11,
    textAlign: "center",
    marginTop: 10,
  },
});
