import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SongListItem } from "@/components/songs/SongListItem";
import { Screen } from "@/components/ui/Screen";
import { Colors } from "@/constants/colors";
import { GENRES } from "@/constants/genres";
import { GRID_MAX_WIDTH, useLayout } from "@/hooks/use-layout";
import { getSongs } from "@/repositories/songsRepository";
import type { Song } from "@/types";

const TABS = ["すべて", ...GENRES.slice(0, 4)];

export default function SongsScreen() {
  const params = useLocalSearchParams<{ genre?: string }>();
  const { isWide, columns } = useLayout();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [genre, setGenre] = useState<string>(
    params.genre && TABS.includes(params.genre) ? params.genre : "すべて",
  );

  useEffect(() => {
    getSongs()
      .then(setSongs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return songs
      .filter((song) => genre === "すべて" || song.genre === genre)
      .filter((song) => {
        if (!keyword.trim()) {
          return true;
        }
        const lower = keyword.trim().toLowerCase();
        return (
          song.title.toLowerCase().includes(lower) ||
          song.artistName.toLowerCase().includes(lower)
        );
      })
      .sort((a, b) => b.currentPrice - a.currentPrice);
  }, [songs, genre, keyword]);

  return (
    <Screen
      title="楽曲一覧"
      subtitle="気になる楽曲を探して、詳細を確認しよう。"
      showBottomNav
      maxWidth={GRID_MAX_WIDTH}
    >
      <TextInput
        style={styles.search}
        value={keyword}
        onChangeText={setKeyword}
        placeholder="楽曲名・アーティストで検索"
        placeholderTextColor={Colors.textFaint}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabs}
        contentContainerStyle={styles.tabsContent}
      >
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tab, genre === tab && styles.tabActive]}
            onPress={() => setGenre(tab)}
          >
            <Text style={[styles.tabText, genre === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={Colors.accent} style={styles.loading} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>該当する楽曲がありません</Text>
        </View>
      ) : isWide ? (
        // 画面が広いときはタイルで並べる。1行が横に伸びきるのを防ぐ。
        <View style={styles.grid}>
          {filtered.map((song) => (
            <View
              key={song.id}
              style={[styles.gridCell, { width: `${100 / columns}%` }]}
            >
              <SongListItem song={song} variant="tile" />
            </View>
          ))}
        </View>
      ) : (
        filtered.map((song) => <SongListItem key={song.id} song={song} />)
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    backgroundColor: Colors.input,
    color: Colors.text,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  tabs: {
    marginBottom: 16,
    flexGrow: 0,
  },
  tabsContent: {
    gap: 8,
  },
  tab: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.card,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  tabActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  tabText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  tabTextActive: {
    color: Colors.onAccent,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  gridCell: {
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  loading: {
    marginTop: 32,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    color: Colors.textFaint,
    fontSize: 13,
  },
});
