import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
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
import { Screen } from "@/components/ui/Screen";
import { Colors } from "@/constants/colors";
import { GENRES } from "@/constants/genres";
import { useAuthUser } from "@/hooks/use-auth-user";
import { getArtistByUserId } from "@/repositories/artistsRepository";
import { getSongById, updateSong } from "@/repositories/songsRepository";
import type { Song, SongStatus } from "@/types";

export default function EditSongScreen() {
  const { songId } = useLocalSearchParams<{ songId: string }>();
  const { firebaseUser } = useAuthUser();

  const [song, setSong] = useState<Song | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState<string>(GENRES[0]);
  const [description, setDescription] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [jacketUrl, setJacketUrl] = useState("");
  const [status, setStatus] = useState<SongStatus>("public");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!songId || !firebaseUser) {
      return;
    }
    Promise.all([getSongById(songId), getArtistByUserId(firebaseUser.uid)])
      .then(([songData, artist]) => {
        setSong(songData);
        if (songData) {
          setTitle(songData.title);
          setGenre(songData.genre);
          setDescription(songData.description);
          setAudioUrl(songData.audioUrl);
          setJacketUrl(songData.jacketUrl);
          setStatus(songData.status);
        }
        // アーティスト本人以外は編集できない（非機能要件 14.3）
        setAllowed(Boolean(songData && artist && songData.artistId === artist.id));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [songId, firebaseUser]);

  const handleSave = async () => {
    if (!song) {
      return;
    }
    if (!title.trim()) {
      Alert.alert("エラー", "楽曲タイトルを入力してください。");
      return;
    }
    const urlPattern = /^https?:\/\/.+/;
    if (
      (audioUrl.trim() && !urlPattern.test(audioUrl.trim())) ||
      (jacketUrl.trim() && !urlPattern.test(jacketUrl.trim()))
    ) {
      Alert.alert("エラー", "URLは http:// または https:// で始まる形式で入力してください。");
      return;
    }

    setSubmitting(true);
    try {
      await updateSong(song.id, {
        title: title.trim(),
        genre,
        description: description.trim(),
        audioUrl: audioUrl.trim(),
        jacketUrl: jacketUrl.trim(),
        status,
      });
      Alert.alert("保存完了", "楽曲情報を更新しました。");
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert("エラー", "保存に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Screen title="楽曲編集">
        <ActivityIndicator color={Colors.accent} />
      </Screen>
    );
  }

  if (!song || !allowed) {
    return (
      <Screen title="楽曲編集">
        <Text style={styles.errorText}>
          {song ? "この楽曲を編集する権限がありません。" : "楽曲が見つかりません。"}
        </Text>
        <AppButton title="戻る" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen title="楽曲編集" subtitle={song.title}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← 戻る</Text>
      </Pressable>

      <Text style={styles.label}>楽曲タイトル</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
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
        multiline
        numberOfLines={4}
        placeholderTextColor={Colors.textFaint}
      />

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

      <Text style={styles.label}>公開状態</Text>
      <View style={styles.genres}>
        {(
          [
            { value: "public", label: "公開" },
            { value: "draft", label: "下書き" },
            { value: "archived", label: "非公開" },
          ] as { value: SongStatus; label: string }[]
        ).map((item) => (
          <Pressable
            key={item.value}
            style={[styles.genreChip, status === item.value && styles.genreChipActive]}
            onPress={() => setStatus(item.value)}
          >
            <Text
              style={[styles.genreText, status === item.value && styles.genreTextActive]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <AppButton
        title={submitting ? "保存中..." : "保存する"}
        onPress={handleSave}
        disabled={submitting}
        style={styles.submit}
      />
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
  submit: {
    marginTop: 24,
  },
  errorText: {
    color: Colors.textFaint,
    fontSize: 13,
    marginBottom: 12,
  },
});
