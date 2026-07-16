import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
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
import { getLikedSongIds } from "@/repositories/likesRepository";
import { addSongPlaySeconds, registerSongPlay } from "@/services/recordSongPlay";
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
  const [focused, setFocused] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const player = useAudioPlayer();
  const currentAudioUrlRef = useRef<string | null>(null);
  const listRef = useRef<FlatList<WeeklyRankingItem>>(null);
  const rootRef = useRef<View>(null);
  const lastWheelAtRef = useRef(0);
  const lastWheelEventAtRef = useRef(0);
  const lastWheelDeltaRef = useRef(0);
  const wheelGateOpenRef = useRef(true);

  // iOSのサイレントモードでも再生できるようにする
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(console.error);
  }, []);

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
      setFocused(true);
      loadSongs();
      refreshProfile().catch(console.error);

      return () => {
        // 画面を離れたら再生を止める
        setFocused(false);
      };
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
  const activeSongId = activeSong?.id ?? null;

  // Webはページスナップが効かないため、ホイール1回につき1曲だけ送る
  const handleWheel = useCallback(
    (event: { deltaY: number }) => {
      const now = Date.now();
      const absDelta = Math.abs(event.deltaY);

      // 新しいジェスチャーの判定は2通り:
      // 1) イベントの流れが150ms以上途切れた（指を離して一呼吸おいた）
      // 2) 勢いが急に強くなった（慣性の減衰中に新しくフリックした）
      const sinceLastEvent = now - lastWheelEventAtRef.current;
      const deltaJumped = absDelta > lastWheelDeltaRef.current * 1.5 + 10;
      lastWheelEventAtRef.current = now;
      lastWheelDeltaRef.current = absDelta;

      if (sinceLastEvent > 150 || deltaJumped) {
        wheelGateOpenRef.current = true;
      }
      if (!wheelGateOpenRef.current) {
        return;
      }
      if (absDelta < 20) {
        return;
      }

      // ゲートはここで必ず閉じる（1ジェスチャー1曲）
      wheelGateOpenRef.current = false;

      if (now - lastWheelAtRef.current < 300) {
        return; // ステップの最短間隔（アニメーション中の暴発防止）
      }

      const direction = event.deltaY > 0 ? 1 : -1;
      const nextIndex = Math.max(
        0,
        Math.min(items.length - 1, activeIndex + direction),
      );
      if (nextIndex === activeIndex) {
        return;
      }

      lastWheelAtRef.current = now;
      listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    },
    [items.length, activeIndex],
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

  // リールの再生を記録する（株価計算の指標になる）
  // 2秒以上表示されたら1再生としてカウントし、表示時間を再生秒数として加算する
  useEffect(() => {
    if (!focused || !activeSongId) {
      return;
    }
    const songId = activeSongId;
    const startedAt = Date.now();
    const playTimer = setTimeout(() => {
      registerSongPlay(songId);
    }, 2000);

    return () => {
      clearTimeout(playTimer);
      const seconds = (Date.now() - startedAt) / 1000;
      if (seconds >= 1) {
        addSongPlaySeconds(songId, seconds);
      }
    };
  }, [focused, activeSongId]);

  // 表示中のリールの曲だけを再生し、画面外の曲は停止する
  useEffect(() => {
    const audioUrl = focused ? activeSong?.audioUrl || null : null;

    if (!audioUrl) {
      player.pause();
      return;
    }

    if (currentAudioUrlRef.current !== audioUrl) {
      currentAudioUrlRef.current = audioUrl;
      player.replace({ uri: audioUrl });
      player.loop = true;
    }
    player.play();
  }, [player, focused, activeSong?.audioUrl]);

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
