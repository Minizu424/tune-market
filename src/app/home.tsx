import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from "react-native";
import { BottomNav } from "@/components/navigation/BottomNav";
import { ReelCard } from "@/components/reel/ReelCard";
import { CommentsSheet } from "@/components/comments/CommentsSheet";
import { SupportModal } from "@/components/support/SupportModal";
import { BuyStockModal } from "@/components/trade/BuyStockModal";
import { Colors } from "@/constants/colors";
import { useAuthUser } from "@/hooks/use-auth-user";
import { formatPoint } from "@/lib/format";
import { usePlayback } from "@/contexts/PlaybackContext";
import { getLikedSongIds } from "@/repositories/likesRepository";
import { toggleSongLike } from "@/services/toggleSongLike";
import {
  getWeeklySupportRanking,
  type WeeklyRankingItem,
} from "@/services/getRankingSongs";

type ModalKind = "buy" | "support" | "comments" | null;

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
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const playback = usePlayback();
  const { playQueue } = playback;
  const listRef = useRef<FlatList<WeeklyRankingItem>>(null);
  const rootRef = useRef<View>(null);
  const lastWheelAtRef = useRef(0);
  const activeIndexRef = useRef(0);
  const didInitRef = useRef(false);

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
      // 画面を離れても再生は続ける（ミニプレイヤーに引き継ぐ）
    }, [loadSongs, refreshProfile]),
  );

  // いいね済み楽曲の読み込み
  useEffect(() => {
    if (!profile) {
      return;
    }
    getLikedSongIds(profile.id).then(setLikedIds).catch(console.error);
  }, [profile?.id]);

  // いいねトグル（楽観的更新）
  const handleToggleLike = useCallback(
    async (songId: string) => {
      if (!profile) {
        return;
      }
      const wasLiked = likedIds.has(songId);

      setLikedIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) {
          next.delete(songId);
        } else {
          next.add(songId);
        }
        return next;
      });
      setItems((prev) =>
        prev.map((item) =>
          item.song.id === songId
            ? {
                ...item,
                song: {
                  ...item.song,
                  likeCount: item.song.likeCount + (wasLiked ? -1 : 1),
                },
              }
            : item,
        ),
      );

      try {
        await toggleSongLike(profile.id, songId);
      } catch (error) {
        console.error(error);
        // 失敗したら元に戻す
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (wasLiked) {
            next.add(songId);
          } else {
            next.delete(songId);
          }
          return next;
        });
        setItems((prev) =>
          prev.map((item) =>
            item.song.id === songId
              ? {
                  ...item,
                  song: {
                    ...item.song,
                    likeCount: item.song.likeCount + (wasLiked ? 1 : -1),
                  },
                }
              : item,
          ),
        );
      }
    },
    [profile, likedIds],
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

  // Webはページスナップが効かないため、ホイール1回につき1曲だけ送る
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  // 1曲ぶんリールを送る（最新のactiveIndexを参照するためref経由）
  const stepReel = useCallback(
    (direction: number) => {
      const current = activeIndexRef.current;
      const nextIndex = Math.max(0, Math.min(items.length - 1, current + direction));
      if (nextIndex === current) {
        return;
      }
      lastWheelAtRef.current = Date.now();
      listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    },
    [items.length],
  );

  // Web用のホイール操作: スクロールしたら即1曲送る。
  // 直後350msは無視するだけのシンプルな実装（慣性で稀に2曲動くのは許容）。
  const handleWheel = useCallback(
    (event: { deltaY: number }) => {
      const now = Date.now();
      if (now - lastWheelAtRef.current < 350) {
        return;
      }
      if (Math.abs(event.deltaY) < 40) {
        return; // 小さいスクロールでは動かさない
      }
      stepReel(event.deltaY > 0 ? 1 : -1);
    },
    [stepReel],
  );

  // react-native-webはonWheelプロパティを伝えないため、DOMに直接リスナーを張る
  const handleWheelRef = useRef(handleWheel);
  useEffect(() => {
    handleWheelRef.current = handleWheel;
  }, [handleWheel]);

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }
    const node = rootRef.current as unknown as HTMLElement | null;
    if (!node || typeof node.addEventListener !== "function") {
      return;
    }
    const listener = (event: { deltaY: number }) => {
      handleWheelRef.current(event);
    };
    node.addEventListener("wheel", listener as unknown as EventListener, {
      passive: true,
    });
    return () =>
      node.removeEventListener("wheel", listener as unknown as EventListener);
  }, []);

  // 初回: キューを設定。すでに再生中の曲がリール内にあればそこから開始する
  useEffect(() => {
    if (didInitRef.current || items.length === 0 || viewportHeight === 0) {
      return;
    }
    didInitRef.current = true;
    const songs = items.map((item) => item.song);
    const playingIndex = songs.findIndex(
      (song) => song.id === playback.currentSong?.id,
    );
    const startIndex = playingIndex >= 0 ? playingIndex : 0;
    setActiveIndex(startIndex);
    if (startIndex > 0) {
      listRef.current?.scrollToIndex({ index: startIndex, animated: false });
    }
    playQueue(songs, startIndex);
  }, [items, viewportHeight, playQueue, playback.currentSong?.id]);

  // リール操作に合わせて再生する曲を切り替える
  useEffect(() => {
    if (!didInitRef.current || items.length === 0) {
      return;
    }
    playQueue(
      items.map((item) => item.song),
      activeIndex,
    );
  }, [activeIndex, items, playQueue]);

  // 曲が最後まで再生されて自動で次に進んだら、リールも追従してスクロールする
  useEffect(() => {
    if (!didInitRef.current) {
      return;
    }
    const index = playback.currentIndex;
    if (index >= 0 && index < items.length && index !== activeIndexRef.current) {
      setActiveIndex(index);
      listRef.current?.scrollToIndex({ index, animated: true });
    }
  }, [playback.currentIndex, items.length]);


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
      ref={rootRef}
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
          ref={listRef}
          data={items}
          keyExtractor={keyExtractor}
          renderItem={({ item, index }) => (
            <ReelCard
              song={item.song}
              height={viewportHeight}
              isActive={index === activeIndex}
              weeklyRank={index + 1}
              isLiked={likedIds.has(item.song.id)}
              onPressLike={() => handleToggleLike(item.song.id)}
              onPressComments={() => setModal("comments")}
              onPressBuy={() => setModal("buy")}
              onPressSupport={() => setModal("support")}
            />
          )}
          pagingEnabled
          // 勢いのあるスワイプでも次の1曲で必ず止める
          snapToInterval={viewportHeight}
          disableIntervalMomentum
          decelerationRate="fast"
          // Webは自由スクロールを止めてホイールで1曲ずつ送る
          scrollEnabled={Platform.OS !== "web"}
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

      {activeSong && (
        <CommentsSheet
          visible={modal === "comments"}
          song={activeSong}
          profile={profile}
          onClose={() => setModal(null)}
          onCommentAdded={() =>
            setItems((prev) =>
              prev.map((item) =>
                item.song.id === activeSong.id
                  ? {
                      ...item,
                      song: {
                        ...item.song,
                        commentCount: item.song.commentCount + 1,
                      },
                    }
                  : item,
              ),
            )
          }
        />
      )}

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
