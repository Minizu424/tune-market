import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ViewToken,
} from "react-native";
import { BottomNav } from "@/components/navigation/BottomNav";
import { ReelCard } from "@/components/reel/ReelCard";
import { ReelSeekBar } from "@/components/reel/ReelSeekBar";
import { CommentsSheet } from "@/components/comments/CommentsSheet";
import { SupportModal } from "@/components/support/SupportModal";
import { BuyStockModal } from "@/components/trade/BuyStockModal";
import { StatusBar } from "expo-status-bar";
import { Colors } from "@/constants/colors";
import { GENRES } from "@/constants/genres";
import { useAuthUser } from "@/hooks/use-auth-user";
import {
  neighborAudioUrls,
  useAudioPrefetch,
} from "@/hooks/use-audio-prefetch";
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
/**
 * 最後に見ていたリールの曲ID。
 * 他タブへ移動するとこの画面はアンマウントされるため、モジュール変数に逃がして
 * 戻ってきたときに同じ位置から再開できるようにする。
 */
let lastViewedSongId: string | null = null;

export default function HomeScreen() {
  const { profile, refreshProfile } = useAuthUser();
  const [items, setItems] = useState<WeeklyRankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const { height: windowHeight } = useWindowDimensions();
  // ヘッダー・ジャンルバー・シークバー・下タブぶんを引いた概算
  const fallbackHeight = Math.max(360, windowHeight - 270);
  const viewportHeight = measuredHeight > 0 ? measuredHeight : fallbackHeight;
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
  // 自動スクロールのガードが解除されないまま残ると、以降ユーザーが
  // スクロールしても曲が切り替わらなくなるため、期限を持たせる
  const autoScrollDeadlineRef = useRef(0);

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
  // effect で更新すると1描画ぶん古い値が残り、「自動送り中」と誤判定して
  // ユーザーのスクロールで曲が切り替わらなくなる。描画時に同期で更新する。
  activeIndexRef.current = activeIndex;
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
      // 再生を切り替えない。目的地に到着するか、期限を過ぎたら解除する。
      const target = autoScrollTargetRef.current;
      if (target !== null) {
        if (index === target) {
          autoScrollTargetRef.current = null;
          return;
        }
        if (Date.now() < autoScrollDeadlineRef.current) {
          return;
        }
        // 期限切れ。目的地に着かなかったので、ユーザー操作として扱う
        autoScrollTargetRef.current = null;
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
      // ユーザー操作なので自動送りのガードは解除する
      autoScrollTargetRef.current = null;
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
      (song) => song.id === (playback.currentSong?.id ?? lastViewedSongId),
    );
    const startIndex = playingIndex >= 0 ? playingIndex : 0;
    setActiveIndex(startIndex);
    if (startIndex > 0) {
      // スクロールを伴うときだけガードを張る（先頭表示なら不要）
      autoScrollTargetRef.current = startIndex;
      autoScrollDeadlineRef.current = Date.now() + 1500;
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
      autoScrollDeadlineRef.current = Date.now() + 1500;
      listRef.current?.scrollToIndex({ index, animated: true });
    }
  }, [playback.currentIndex, filteredItems.length]);


  const handleCompleted = useCallback(() => {
    loadSongs();
    refreshProfile().catch(console.error);
  }, [loadSongs, refreshProfile]);

  // 一番上で引っ張るとランキングを再読み込みする
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadSongs();
      await refreshProfile();
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  }, [loadSongs, refreshProfile]);

  const keyExtractor = useCallback(
    (item: WeeklyRankingItem) => item.song.id,
    [],
  );

  // 復帰位置。再生中の曲 → 最後に見ていた曲 → 先頭、の順で探す。
  // 一度決めたら固定して、スクロール中に飛ばされないようにする。
  // 表示中の曲の前後2曲ぶんの音源を先読みして、スクロール直後の待ちをなくす
  const prefetchUrls = useMemo(
    () =>
      neighborAudioUrls(filteredItems, activeIndex, (item) => item.song.audioUrl),
    [filteredItems, activeIndex],
  );
  useAudioPrefetch(prefetchUrls);

  // 表示中の曲を控えておき、他タブから戻ったときの復帰位置に使う。
  // レンダー中に書くと復帰位置を決める前に先頭の曲で上書きしてしまうので、描画後に記録する。
  useEffect(() => {
    const item = itemsRef.current[activeIndex];
    if (item) {
      lastViewedSongId = item.song.id;
    }
  }, [activeIndex]);

  const restoredIndexRef = useRef<number | null>(null);
  const initialScrollIndex = useMemo(() => {
    if (restoredIndexRef.current != null) {
      return restoredIndexRef.current;
    }
    if (filteredItems.length === 0) {
      return 0;
    }
    const targetId = playback.currentSong?.id ?? lastViewedSongId;
    const found = filteredItems.findIndex((item) => item.song.id === targetId);
    restoredIndexRef.current = found >= 0 ? found : 0;
    return restoredIndexRef.current;
  }, [filteredItems, playback.currentSong?.id]);

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
      {...swipeHandlers}
    >
      <StatusBar style="dark" />

      <View style={styles.contentWrap}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tune Market</Text>
        <Text style={styles.headerPoint}>
          {profile ? `${formatPoint(profile.pointBalance)} pt` : ""}
        </Text>
      </View>

      {/*
        絞り込みバー。
        タグを選ぶと行が増えて高さが変わり、下のリールが押し出されて
        買うボタンがはみ出していたため、常に1行の固定高にしている。
      */}
      <View style={styles.genreBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.genreBarContent}
        >
          {hasGenreFilter && (
            <Pressable
              style={[styles.genreChip, styles.resetChip]}
              onPress={() => {
                setGenreFilter({});
                setTagFilter({});
              }}
            >
              <Text style={[styles.genreChipText, styles.resetChipText]}>
                リセット
              </Text>
            </Pressable>
          )}

          {Object.keys(tagFilter).map((tag) => {
            const mode = tagFilter[tag];
            return (
              <Pressable
                key={`tag-${tag}`}
                style={[
                  styles.genreChip,
                  mode === "include" && styles.genreChipInclude,
                  mode === "exclude" && styles.genreChipExclude,
                ]}
                onPress={() => cycleTag(tag)}
              >
                <Text
                  style={[
                    styles.genreChipText,
                    mode === "include" && styles.genreChipTextInclude,
                    mode === "exclude" && styles.genreChipTextExclude,
                  ]}
                >
                  {mode === "exclude" ? `✕ #${tag}` : `#${tag}`}
                </Text>
              </Pressable>
            );
          })}

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
                    mode === "include" && styles.genreChipTextInclude,
                    mode === "exclude" && styles.genreChipTextExclude,
                  ]}
                >
                  {mode === "exclude" ? `✕ ${genre}` : genre}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
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
        <View
          style={styles.listWrap}
          onLayout={(event) => setMeasuredHeight(event.nativeEvent.layout.height)}
        >
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.accent}
            />
          }
          // 勢いのあるスワイプでも次の1曲で必ず止める
          snapToInterval={viewportHeight}
          disableIntervalMomentum
          decelerationRate="fast"
          // Webは自由スクロールを止めてホイールで1曲ずつ送る
          scrollEnabled={Platform.OS !== "web"}
          showsVerticalScrollIndicator={false}
          getItemLayout={getItemLayout}
          initialScrollIndex={initialScrollIndex}
          viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
          initialNumToRender={2}
          windowSize={3}
        />
        </View>
      )}

      {activeSong?.audioUrl ? (
        <ReelSeekBar expanded={!playback.isPlaying} />
      ) : null}
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

/** リールの中身の最大幅。広い画面でも横に伸ばしすぎない */
const REEL_MAX_WIDTH = 560;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    // 下タブは絶対配置なので、その高さぶんを空けておく
    paddingBottom: 80,
  },
  // 地は全幅のまま、中身だけ中央に寄せる。
  // 他の画面（Screen コンポーネント）と同じ扱いにして見た目を揃える。
  contentWrap: {
    flex: 1,
    width: "100%",
    maxWidth: REEL_MAX_WIDTH,
    alignSelf: "center",
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
    paddingTop: 56,
    paddingBottom: 10,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listWrap: {
    flex: 1,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  headerPoint: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  genreBar: {
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.cardBorder,
  },
  genreBarContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  genreChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.input,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  genreChipInclude: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  genreChipExclude: {
    backgroundColor: "#FCEBEB",
    borderColor: Colors.down,
  },
  genreChipText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  // 選択中は黒地に白文字
  genreChipTextInclude: {
    color: Colors.onAccent,
  },
  // 除外は薄い赤地なので、文字も赤系にしないと読めない
  genreChipTextExclude: {
    color: Colors.down,
  },
  resetChip: {
    borderColor: Colors.text,
  },
  resetChipText: {
    color: Colors.text,
  },
});
