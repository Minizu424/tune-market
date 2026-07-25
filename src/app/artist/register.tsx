import { router } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { notify } from "@/lib/notify";
import { AppButton } from "@/components/ui/AppButton";
import { Screen } from "@/components/ui/Screen";
import { Colors } from "@/constants/colors";
import { GENRES } from "@/constants/genres";
import { useAuthUser } from "@/hooks/use-auth-user";
import { registerArtist } from "@/services/registerArtist";

export default function ArtistRegisterScreen() {
  const { firebaseUser, refreshProfile } = useAuthUser();
  const [artistName, setArtistName] = useState("");
  const [profileText, setProfileText] = useState("");
  const [snsLink, setSnsLink] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    );
  };

  const handleRegister = async () => {
    if (!firebaseUser) {
      notify("エラー", "ログインしてください。");
      return;
    }
    if (!artistName.trim()) {
      notify("エラー", "アーティスト名を入力してください。");
      return;
    }

    setSubmitting(true);
    try {
      await registerArtist({
        userId: firebaseUser.uid,
        artistName: artistName.trim(),
        profile: profileText.trim(),
        genres: selectedGenres,
        snsLink: snsLink.trim(),
      });
      await refreshProfile();
      notify("登録完了", "アーティスト登録が完了しました！");
      router.replace("/artist/dashboard");
    } catch (error) {
      notify(
        "登録失敗",
        error instanceof Error ? error.message : "登録に失敗しました。",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen title="アーティスト登録" subtitle="楽曲を投稿して、応援を集めよう。">
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← 戻る</Text>
      </Pressable>

      <Text style={styles.label}>アーティスト名</Text>
      <TextInput
        style={styles.input}
        value={artistName}
        onChangeText={setArtistName}
        placeholder="例：Taro Beats"
        placeholderTextColor={Colors.textFaint}
      />

      <Text style={styles.label}>ジャンル（複数選択可）</Text>
      <View style={styles.genres}>
        {GENRES.map((genre) => {
          const selected = selectedGenres.includes(genre);
          return (
            <Pressable
              key={genre}
              style={[styles.genreChip, selected && styles.genreChipActive]}
              onPress={() => toggleGenre(genre)}
            >
              <Text style={[styles.genreText, selected && styles.genreTextActive]}>
                {genre}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>プロフィール</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={profileText}
        onChangeText={setProfileText}
        placeholder="どんな音楽を作っているか紹介しましょう"
        placeholderTextColor={Colors.textFaint}
        multiline
        numberOfLines={4}
      />

      <Text style={styles.label}>SNS / リンク（任意）</Text>
      <TextInput
        style={styles.input}
        value={snsLink}
        onChangeText={setSnsLink}
        placeholder="https://..."
        placeholderTextColor={Colors.textFaint}
        autoCapitalize="none"
      />

      <AppButton
        title={submitting ? "登録中..." : "登録する"}
        onPress={handleRegister}
        disabled={submitting}
        style={styles.submit}
      />
      <Text style={styles.note}>登録後はプロフィールの編集が可能です</Text>
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
    marginTop: 14,
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
    color: Colors.onAccent,
  },
  submit: {
    marginTop: 24,
  },
  note: {
    color: Colors.textFaint,
    fontSize: 11,
    textAlign: "center",
    marginTop: 10,
  },
});
