import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from "react-native";
import { BottomNav } from "@/components/navigation/BottomNav";
import { ReelCard } from "@/components/reel/ReelCard";
import { ReelSeekBar } from "@/components/reel/ReelSeekBar";
import { CommentsSheet } from "@/components/comments/CommentsSheet";
import { SupportModal } from "@/components/support/SupportModal";
import { BuyStockModal } from "@/components/trade/BuyStockModal";
import { Colors } from "@/constants/colors";
import { GENRES } from "@/constants/genres";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useSwipeTabs } from "@/hooks/use-swipe-tabs";
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
  // ジャンル/タグフィルター: タップで「含む」→「除外」→「解除」の3状態
  const [genreFilter, setGenreFilter] = useState<Record<string, "include" | "exclude">>({});
  const [tagFilter, setTagFilter] = useState<Record<string, "include" | "exclude">>({});

  const playback = usePlayback();
  const { playQueue } = playback;
  const swipeHandlers = useSwipeTabs();
  const listRef = useRef<FlatList<WeeklyRankingItem>>(null);
  const rootRef = useRef<View>(null);
  const lastWheelAtRef = useRef(0);
  const activeIndexRef = useRef(0);
  const didInitRef = useRef(false);
  const itemsRef = useRef<WeeklyRankingItem[]>([]);
  const playQueueRef = useRef(playQueue);
  const currentSongIdRef = useRef<string | null>(null);
  // 自動スクロール（曲終了の自動送り）中の目的地。到着まで表示判定からの再生切替を止める
  const autoScrollTargetRef = useRef<number | null>(null);

  const filteredItems = useMemo(() => {
    const includedGenres = GENRES.filter((g) => genreFilter[g] === "include");
    const excludedGenres = GENRES.filter((g) => genreFilter[g] === "exclude");
    const includedTags = Object.keys(tagFilter).filter(
      (t) => tagFilter[t] === "include",
    );
    const excludedTags = Object.keys(tagFilter).filter(
      (t) => tagFilter[t] === "exclude",
    );

    return items.filter(({ song }) => {
      const genre = song.genre as (typeof GENRES)[number];
      if (excludedGenres.includes(genre)) {
        return false;
      }
      if (includedGenres.length > 0 && !includedGenres.includes(genre)) {
        return false;
      }
      const tags = song.tags ?? [];
      if (excludedTags.some((t) => tags.includes(t))) {
        return false;
      }
      if (includedTags.length > 0 && !includedTags.some((t) => tags.includes(t))) {
        return false;
      }
      return true;
    });
  }, [items, genreFilter, tagFilter]);
  const hasGenreFilter =
    Object.keys(genreFilter).length > 0 || Object.keys(tagFilter).length > 0;

  const cycleFilter = useCallback(
    (setter: typeof setGenreFilter) => (key: string) => {
      setter((prev) => {
        const next = { ...prev };
        if (!next[key]) {
          next[key] = "include";
        } else if (next[key] === "include") {
          next[key] = "exclude";
        } else {
          delete next[key];
        }
        return next;
      });
    },
    [],
  );
  const cycleGenre = useMemo(() => cycleFilter(setGenreFilter), [cycleFilter]);
  const cycleTag = useMemo(() => cycleFilter(setTagFilter), [cycleFilter]);

  itemsRef.current = filteredItems;
  playQueueRef.current = playQueue;
  currentSongIdRef.current = playback.currentSong?.id ?? null;

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
      if (!visible || typeof visible.index !== "number") {
        return;
      }
      const index = visible.index;
      setActiveIndex(index);

      // 自動スクロール中（曲終了の自動送りなど）は、途中経過のリールで
      // 再生を切り替えない。目的地に到着したら解除する。
      if (autoScrollTargetRef.current !== null) {
        if (index === autoScrollTargetRef.current) {
          autoScrollTargetRef.current = null;
        }
        return;
      }

      // ユーザーのスクロールによる切り替え
      const songs = itemsRef.current.map((item) => item.song);
      if (songs[index]) {
        playQueueRef.current(songs, index);
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

  const activeSong = filteredItems[activeIndex]?.song ?? null;

  // Webはページスナップが効かないため、ホイール1回につき1曲だけ送る
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  // 1曲ぶんリールを送る（最新のactiveIndexを参照するためref経由）
  const stepReel = useCallback(
    (direction: number) => {
      const current = activeIndexRef.current;
      const nextIndex = Math.max(
        0,
        Math.min(itemsRef.current.length - 1, current + direction),
      );
      if (nextIndex === current) {
        return;
      }
      lastWheelAtRef.current = Date.now();
      listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    },
    [],
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
    if (didInitRef.current || filteredItems.length === 0 || viewportHeight === 0) {
      return;
    }
    didInitRef.current = true;
    const songs = filteredItems.map((item) => item.song);
    const playingIndex = songs.findIndex(
      (song) => song.id === playback.currentSong?.id,
    );
    const startIndex = playingIndex >= 0 ? playingIndex : 0;
    setActiveIndex(startIndex);
    autoScrollTargetRef.current = startIndex;
    if (startIndex > 0) {
      listRef.current?.scrollToIndex({ index: startIndex, animated: false });
    }
    playQueue(songs, startIndex);
  }, [filteredItems, viewportHeight, playQueue, playback.currentSong?.id]);

  // 楽曲リストやフィルターが変わったら、再生中の曲を保ったままキューを差し替える
  useEffect(() => {
    if (!didInitRef.current || filteredItems.length === 0) {
      return;
    }
    const songs = filteredItems.map((item) => item.song);
    const playingIndex = songs.findIndex(
      (song) => song.id === currentSongIdRef.current,
    );
    const index =
      playingIndex >= 0
        ? playingIndex
        : Math.min(Math.max(activeIndexRef.current, 0), songs.length - 1);
    playQueue(songs, index);
  }, [filteredItems, playQueue]);

  // 曲が最後まで再生されて自動で次に進んだら、リールも追従してスクロールする
  useEffect(() => {
    if (!didInitRef.current) {
      return;
    }
    const index = playback.currentIndex;
    if (
      index >= 0 &&
      index < filteredItems.length &&
      index !== activeIndexRef.current
    ) {
      setActiveIndex(index);
      autoScrollTargetRef.current = index;
      listRef.current?.scrollToIndex({ index, animated: true });
    }
  }, [playback.currentIndex, filteredItems.length]);


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
      {...swipeHandlers}
    >
      {loading || viewportHeight === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            {hasGenreFilter
              ? "このジャンル条件に合う楽曲がありません。\nフィルターを変更してみてください。"
              : "まだ楽曲がありません。\nシードスクリプトでテスト楽曲を投入してください。"}
          </Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={filteredItems}
          keyExtractor={keyExtractor}
          renderItem={({ item, index }) => (
            <ReelCard
              song={item.song}
              height={viewportHeight}
              isActive={index === activeIndex}
              weeklyRank={hasGenreFilter ? undefined : index + 1}
              isLiked={likedIds.has(item.song.id)}
              isPaused={!playback.isPlaying}
              onTogglePlay={playback.toggle}
              tagStates={tagFilter}
              onPressTag={cycleTag}
              onPressLike={() => handleToggleLike(item.song.id)}
              onPressComments={() => setModal("comments")}
              onPressBuy={() => setModal("buy")}
              onPressSupport={() => setModal("support")}
            />
          )}
          pagingEnabled
          onScrollBeginDrag={() => {
            autoScrollTargetRef.current = null;
          }}
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

      {activeSong?.audioUrl ? (
        <ReelSeekBar expanded={!playback.isPlaying} />
      ) : null}

      <View style={styles.header} pointerEvents="none">
        <Text style={styles.headerTitle}>Tune Market</Text>
        <Text style={styles.headerPoint}>
          {profile ? `${formatPoint(profile.pointBalance)} pt` : ""}
        </Text>
      </View>

      <View style={styles.genreBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.genreBarContent}
        >
          {hasGenreFilter && (
            <Pressable
              style={styles.genreChip}
              onPress={() => {
                setGenreFilter({});
                setTagFilter({});
              }}
            >
              <Text style={styles.genreChipText}>リセット</Text>
            </Pressable>
          )}
          {GENRES.map((genre) => {
            const mode = genreFilter[genre];
            return (
              <Pressable
                key={genre}
                style={[
                  styles.genreChip,
                  mode === "include" && styles.genreChipInclude,
                  mode === "exclude" && styles.genreChipExclude,
                ]}
                onPress={() => cycleGenre(genre)}
              >
                <Text
                  style={[
                    styles.genreChipText,
                    mode != null && styles.genreChipTextActive,
                  ]}
                >
                  {mode === "exclude" ? `✕ ${genre}` : genre}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {Object.keys(tagFilter).length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.genreBarContent, styles.tagBarContent]}
          >
            {Object.keys(tagFilter).map((tag) => {
              const mode = tagFilter[tag];
              return (
                <Pressable
                  key={tag}
                  style={[
                    styles.genreChip,
                    mode === "include" && styles.genreChipInclude,
                    mode === "exclude" && styles.genreChipExclude,
                  ]}
                  onPress={() => cycleTag(tag)}
                >
                  <Text
                    style={[styles.genreChipText, styles.genreChipTextActive]}
                  >
                    {mode === "exclude" ? `✕ #${tag}` : `#${tag}`}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {hasGenreFilter && (
          <Text style={styles.genreHint}>
            曲の#タグをタップ: 紫=これを再生 / 赤=除外 / もう一度で解除
          </Text>
        )}
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
  genreBar: {
    position: "absolute",
    top: 92,
    left: 0,
    right: 0,
  },
  genreBarContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tagBarContent: {
    paddingTop: 8,
  },
  genreChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.45)",
    backgroundColor: "rgba(2, 6, 23, 0.55)",
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  genreChipInclude: {
    backgroundColor: "rgba(139, 92, 246, 0.9)",
    borderColor: Colors.accent,
  },
  genreChipExclude: {
    backgroundColor: "rgba(248, 113, 113, 0.85)",
    borderColor: Colors.down,
  },
  genreChipText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  genreChipTextActive: {
    color: "#FFFFFF",
  },
  genreHint: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 10,
    paddingHorizontal: 16,
    marginTop: 6,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 4,
  },
});
