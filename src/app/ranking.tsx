import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { RankingItem } from "@/components/ranking/RankingItem";
import { Screen } from "@/components/ui/Screen";
import { Colors } from "@/constants/colors";
import { formatPoint, formatRate, formatSigned } from "@/lib/format";
import { calculatePriceChangeRate } from "@/repositories/songsRepository";
import {
  getNewListingRanking,
  getTrendingRanking,
  getWeeklySupportRanking,
  type WeeklyRankingItem,
} from "@/services/getRankingSongs";
import type { Song } from "@/types";

type Tab = "weekly" | "trending" | "new";

const TAB_LABELS: { key: Tab; label: string }[] = [
  { key: "weekly", label: "週間応援" },
  { key: "trending", label: "急上昇" },
  { key: "new", label: "新規" },
];

export default function RankingScreen() {
  const [tab, setTab] = useState<Tab>("weekly");
  const [weekly, setWeekly] = useState<WeeklyRankingItem[]>([]);
  const [trending, setTrending] = useState<Song[]>([]);
  const [newSongs, setNewSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getWeeklySupportRanking(20),
      getTrendingRanking(20),
      getNewListingRanking(20),
    ])
      .then(([weeklyData, trendingData, newData]) => {
        setWeekly(weeklyData);
        setTrending(trendingData);
        setNewSongs(newData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Screen
      title="ランキング"
      subtitle="週間応援ランキングや急上昇銘柄を確認しよう。"
      showBottomNav
    >
      <View style={styles.tabs}>
        {TAB_LABELS.map(({ key, label }) => (
          <Pressable
            key={key}
            style={[styles.tab, tab === key && styles.tabActive]}
            onPress={() => setTab(key)}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.accent} />
      ) : (
        <>
          {tab === "weekly" &&
            weekly.map((item, index) => {
              const diff = item.weeklySupportPoint - item.previousWeekSupportPoint;
              return (
                <RankingItem
                  key={item.song.id}
                  rank={index + 1}
                  song={item.song}
                  value={`${formatPoint(
                    item.weeklySupportPoint > 0
                      ? item.weeklySupportPoint
                      : item.song.supportPoint,
                  )} pt`}
                  subValue={`前週比 ${formatSigned(diff)}pt`}
                />
              );
            })}

          {tab === "trending" &&
            trending.map((song, index) => {
              const rate = calculatePriceChangeRate(song);
              return (
                <RankingItem
                  key={song.id}
                  rank={index + 1}
                  song={song}
                  value={`${formatPoint(song.currentPrice)}pt`}
                  subValue={formatRate(rate)}
                  valueColor={rate >= 0 ? Colors.up : Colors.down}
                />
              );
            })}

          {tab === "new" &&
            newSongs.map((song, index) => (
              <RankingItem
                key={song.id}
                rank={index + 1}
                song={song}
                value={`${formatPoint(song.currentPrice)}pt`}
                subValue="新規上場"
              />
            ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.card,
    paddingVertical: 10,
    alignItems: "center",
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
    color: Colors.text,
  },
});
