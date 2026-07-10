import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from "react-native";
import { BottomNav } from "@/components/navigation/BottomNav";
import { ReelCard } from "@/components/reel/ReelCard";
import { SupportModal } from "@/components/support/SupportModal";
import { BuyStockModal } from "@/components/trade/BuyStockModal";
import { Colors } from "@/constants/colors";
import { useAuthUser } from "@/hooks/use-auth-user";
import { formatPoint } from "@/lib/format";
import {
  getWeeklySupportRanking,
  type WeeklyRankingItem,
} from "@/services/getRankingSongs";

type ModalKind = "buy" | "support" | null;

/**
 * リール型ホーム画面。
 * 縦スクロール（1画面1曲）で楽曲を切り替える。
 * 並び順は週間応援ランキング順（ランキング上位曲がホームに出る）。
 */
export default function HomeScreen() {
  const { profile, refreshProfile } = useAuthUser();
  const [items, setItems] = useState<WeeklyRankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [modal, setModal] = useState<ModalKind>(null);

  const loadSongs = useCallback(async () => {
    try {
      const ranking = await getWeeklySupportRanking(30);
      setItems(ranking);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSongs();
      refreshProfile().catch(console.error);
    }, [loadSongs, refreshProfile]),
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const visible = viewableItems.find((token) => token.isViewable);
      if (visible && typeof visible.index === "number") {
        setActiveIndex(visible.index);
      }
    },
    [],
  );

  const viewabilityConfigCallbackPairs = useRef([
    {
      viewabilityConfig: { itemVisiblePercentThreshold: 60 },
      onViewableItemsChanged,
    },
  ]);

  const activeSong = items[activeIndex]?.song ?? null;

  const handleCompleted = useCallback(() => {
    loadSongs();
    refreshProfile().catch(console.error);
  }, [loadSongs, refreshProfile]);

  const keyExtractor = useCallback(
    (item: WeeklyRankingItem) => item.song.id,
    [],
  );

  const getItemLayout = useMemo(
    () =>
      viewportHeight > 0
        ? (_: unknown, index: number) => ({
            length: viewportHeight,
            offset: viewportHeight * index,
            index,
          })
        : undefined,
    [viewportHeight],
  );

  return (
    <View
      style={styles.root}
      onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
    >
      {loading || viewportHeight === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            まだ楽曲がありません。{"\n"}シードスクリプトでテスト楽曲を投入してください。
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={({ item, index }) => (
            <ReelCard
              song={item.song}
              height={viewportHeight}
              isActive={index === activeIndex}
              weeklyRank={index + 1}
              onPressBuy={() => setModal("buy")}
              onPressSupport={() => setModal("support")}
            />
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          getItemLayout={getItemLayout}
          viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
          initialNumToRender={2}
          windowSize={3}
        />
      )}

      <View style={styles.header} pointerEvents="none">
        <Text style={styles.headerTitle}>Tune Market</Text>
        <Text style={styles.headerPoint}>
          {profile ? `${formatPoint(profile.pointBalance)} pt` : ""}
        </Text>
      </View>

      {profile && activeSong && (
        <>
          <BuyStockModal
            visible={modal === "buy"}
            song={activeSong}
            userId={profile.id}
            pointBalance={profile.pointBalance}
            onClose={() => setModal(null)}
            onCompleted={handleCompleted}
          />
          <SupportModal
            visible={modal === "support"}
            song={activeSong}
            userId={profile.id}
            pointBalance={profile.pointBalance}
            onClose={() => setModal(null)}
            onCompleted={handleCompleted}
          />
        </>
      )}

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 56,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 6,
  },
  headerPoint: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 6,
  },
});
