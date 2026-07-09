import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { RankingItem } from "@/components/ranking/RankingItem";
import { SongListItem } from "@/components/songs/SongListItem";
import { AppCard } from "@/components/ui/AppCard";
import { Screen } from "@/components/ui/Screen";
import { Colors } from "@/constants/colors";
import { GENRES } from "@/constants/genres";
import { useAuthUser } from "@/hooks/use-auth-user";
import { formatPoint, formatRate } from "@/lib/format";
import { calculatePriceChangeRate } from "@/repositories/songsRepository";
import {
  getNewListingRanking,
  getTrendingRanking,
  getWeeklySupportRanking,
  type WeeklyRankingItem,
} from "@/services/getRankingSongs";
import type { Song } from "@/types";

export default function HomeScreen() {
  const { profile, refreshProfile } = useAuthUser();
  const [trending, setTrending] = useState<Song[]>([]);
  const [newSongs, setNewSongs] = useState<Song[]>([]);
  const [weekly, setWeekly] = useState<WeeklyRankingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        try {
          const [trendingSongs, latest, weeklyRanking] = await Promise.all([
            getTrendingRanking(3),
            getNewListingRanking(3),
            getWeeklySupportRanking(3),
          ]);
          if (!active) {
            return;
          }
          setTrending(trendingSongs);
          setNewSongs(latest);
          setWeekly(weeklyRanking);
        } catch (error) {
          console.error(error);
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      })();

      refreshProfile().catch(console.error);

      return () => {
        active = false;
      };
    }, [refreshProfile]),
  );

  return (
    <Screen
      title="Tune Market"
      subtitle="将来伸びる楽曲を見つけて、ポイントで応援しよう。"
      showBottomNav
    >
      <AppCard style={styles.card}>
        <Text style={styles.cardLabel}>保有ポイント</Text>
        <Text style={styles.point}>
          {profile ? `${formatPoint(profile.pointBalance)} pt` : "--- pt"}
        </Text>
        <Text style={styles.note}>※ポイント・株は現金化できません</Text>
      </AppCard>

      {loading ? (
        <ActivityIndicator color={Colors.accent} style={styles.loading} />
      ) : (
        <>
          <SectionHeader title="急上昇銘柄" onPressMore={() => router.push("/ranking")} />
          {trending.map((song, index) => (
            <RankingItem
              key={song.id}
              rank={index + 1}
              song={song}
              value={`${formatPoint(song.currentPrice)}pt`}
              subValue={formatRate(calculatePriceChangeRate(song))}
              valueColor={
                calculatePriceChangeRate(song) >= 0 ? Colors.up : Colors.down
              }
            />
          ))}

          <SectionHeader title="新規上場曲" onPressMore={() => router.push("/songs")} />
          {newSongs.map((song) => (
            <SongListItem key={song.id} song={song} />
          ))}

          <SectionHeader
            title="週間応援ランキング"
            onPressMore={() => router.push("/ranking")}
          />
          {weekly.map((item, index) => (
            <RankingItem
              key={item.song.id}
              rank={index + 1}
              song={item.song}
              value={`${formatPoint(
                item.weeklySupportPoint > 0
                  ? item.weeklySupportPoint
                  : item.song.supportPoint,
              )} 応援pt`}
            />
          ))}

          <SectionHeader title="ジャンルから探す" />
          <View style={styles.genreRow}>
            {GENRES.slice(0, 4).map((genre) => (
              <Pressable
                key={genre}
                style={styles.genreChip}
                onPress={() => router.push(`/songs?genre=${encodeURIComponent(genre)}`)}
              >
                <Text style={styles.genreText}>{genre}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

function SectionHeader({
  title,
  onPressMore,
}: {
  title: string;
  onPressMore?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onPressMore && (
        <Pressable onPress={onPressMore}>
          <Text style={styles.sectionMore}>すべて見る</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 20,
  },
  cardLabel: {
    color: Colors.textMuted,
    fontSize: 13,
    marginBottom: 6,
  },
  point: {
    color: Colors.text,
    fontSize: 32,
    fontWeight: "800",
  },
  note: {
    color: Colors.textFaint,
    fontSize: 11,
    marginTop: 6,
  },
  loading: {
    marginTop: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 10,
  },
  sectionTitle: {
    color: Colors.accentSoft,
    fontSize: 15,
    fontWeight: "800",
  },
  sectionMore: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  genreRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  genreChip: {
    backgroundColor: Colors.card,
    borderColor: Colors.cardBorder,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  genreText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
});
