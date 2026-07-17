import { Timestamp, type QueryDocumentSnapshot } from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Colors } from "@/constants/colors";
import { formatPoint } from "@/lib/format";
import {
  getSongCommentsPage,
} from "@/repositories/commentsRepository";
import { addSongComment } from "@/services/addSongComment";
import type { AppUser, Comment, Song } from "@/types";

type CommentsSheetProps = {
  visible: boolean;
  song: Song;
  profile: AppUser | null;
  onClose: () => void;
  /** コメント投稿後に呼ばれる（commentCountの表示更新用） */
  onCommentAdded?: () => void;
};

/**
 * インスタ風のコメント用ボトムシート。
 * 最初は1ページ分だけ表示し、下までスクロールすると続きを読み込む。
 */
export function CommentsSheet({
  visible,
  song,
  profile,
  onClose,
  onCommentAdded,
}: CommentsSheetProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedForSongRef = useRef<string | null>(null);

  // シートは「全画面 / 半分 / 閉じる」の3段階。
  // ハンドル部分を上下にドラッグして切り替える。
  const { height: windowHeight } = useWindowDimensions();
  const FULL_HEIGHT = Math.round(windowHeight * 0.92);
  const HALF_HEIGHT = Math.round(windowHeight * 0.55);

  const sheetHeight = useRef(new Animated.Value(HALF_HEIGHT)).current;
  const heightRef = useRef(HALF_HEIGHT); // 現在のスナップ高さ
  const snapSizesRef = useRef({ full: FULL_HEIGHT, half: HALF_HEIGHT });
  snapSizesRef.current = { full: FULL_HEIGHT, half: HALF_HEIGHT };
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [snapState, setSnapState] = useState<"half" | "full">("half");

  const animateTo = (target: number, after?: () => void) => {
    heightRef.current = target;
    setSnapState(target >= snapSizesRef.current.full ? "full" : "half");
    Animated.spring(sheetHeight, {
      toValue: target,
      friction: 9,
      tension: 60,
      useNativeDriver: false,
    }).start(after);
  };

  const closeSheet = () => {
    Animated.timing(sheetHeight, {
      toValue: 0,
      duration: 160,
      useNativeDriver: false,
    }).start(() => {
      heightRef.current = snapSizesRef.current.half;
      sheetHeight.setValue(snapSizesRef.current.half);
      setSnapState("half");
      onCloseRef.current();
    });
  };

  // ドラッグ終了時の共通スナップ処理
  const settleAt = (currentHeight: number, velocityY: number) => {
    const { full, half } = snapSizesRef.current;
    const projected = currentHeight - velocityY * 200;
    if (projected < half * 0.55) {
      closeSheet();
      return;
    }
    animateTo(projected > (full + half) / 2 ? full : half);
  };

  const dragResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dy) > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_event, gesture) => {
        const { full } = snapSizesRef.current;
        const next = Math.max(80, Math.min(full, heightRef.current - gesture.dy));
        sheetHeight.setValue(next);
      },
      onPanResponderRelease: (_event, gesture) => {
        settleAt(heightRef.current - gesture.dy, gesture.vy);
      },
      onPanResponderTerminate: () => {
        animateTo(heightRef.current);
      },
    }),
  ).current;

  // 開くたびに半分の高さから始める
  useEffect(() => {
    if (visible) {
      heightRef.current = HALF_HEIGHT;
      sheetHeight.setValue(HALF_HEIGHT);
      setSnapState("half");
    }
  }, [visible, HALF_HEIGHT, sheetHeight]);

  // Web用ドラッグ: DOMのポインターイベントで直接動かす
  const dragAreaRef = useRef<View>(null);
  const settleAtRef = useRef(settleAt);
  settleAtRef.current = settleAt;

  useEffect(() => {
    if (Platform.OS !== "web" || !visible) {
      return;
    }
    const node = dragAreaRef.current as unknown as HTMLElement | null;
    if (!node || typeof node.addEventListener !== "function") {
      return;
    }

    let drag: { startY: number; base: number; last: number; lastAt: number } | null =
      null;

    const onDown = (event: PointerEvent) => {
      drag = {
        startY: event.clientY,
        base: heightRef.current,
        last: heightRef.current,
        lastAt: Date.now(),
      };
    };
    const onMove = (event: PointerEvent) => {
      if (!drag) {
        return;
      }
      const next = Math.max(
        80,
        Math.min(snapSizesRef.current.full, drag.base + (drag.startY - event.clientY)),
      );
      drag.last = next;
      drag.lastAt = Date.now();
      sheetHeight.setValue(next);
    };
    const onUp = () => {
      if (!drag) {
        return;
      }
      settleAtRef.current(drag.last, 0);
      drag = null;
    };

    node.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      node.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [visible, sheetHeight]);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await getSongCommentsPage(song.id);
      setComments(page.comments);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
      loadedForSongRef.current = song.id;
    } catch (err) {
      console.error(err);
      setError("コメントの読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  }, [song.id]);

  // シートを開いたとき（または曲が変わったとき）に最初のページを読み込む
  useEffect(() => {
    if (visible && loadedForSongRef.current !== song.id) {
      setComments([]);
      setCursor(null);
      setHasMore(false);
      loadInitial();
    }
  }, [visible, song.id, loadInitial]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading || !cursor) {
      return;
    }
    setLoadingMore(true);
    try {
      const page = await getSongCommentsPage(song.id, cursor);
      setComments((prev) => [...prev, ...page.comments]);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  }, [song.id, cursor, hasMore, loadingMore, loading]);

  const handlePost = async () => {
    if (!profile) {
      return;
    }
    setPosting(true);
    setError(null);
    try {
      const commentId = await addSongComment({
        songId: song.id,
        userId: profile.id,
        userName: profile.displayName || profile.email.split("@")[0],
        text,
      });
      // 投稿したコメントを先頭に足す（再読み込みなしで反映）
      const newComment: Comment = {
        id: commentId,
        songId: song.id,
        userId: profile.id,
        userName: profile.displayName || profile.email.split("@")[0],
        text: text.trim(),
        createdAt: Timestamp.now(),
      };
      setComments((prev) => [newComment, ...prev]);
      setText("");
      onCommentAdded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "コメントの投稿に失敗しました。");
    } finally {
      setPosting(false);
    }
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentItem}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(item.userName || "?").slice(0, 1).toUpperCase()}
        </Text>
      </View>
      <View style={styles.commentBody}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentAuthor}>{item.userName}</Text>
          <Text style={styles.commentDate}>
            {item.createdAt
              ? item.createdAt.toDate().toLocaleDateString("ja-JP")
              : "たった今"}
          </Text>
        </View>
        <Text style={styles.commentText}>{item.text}</Text>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Animated.View style={[styles.sheet, { height: sheetHeight }]}>
          <View
            ref={dragAreaRef}
            style={styles.dragArea}
            {...dragResponder.panHandlers}
          >
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <Pressable
                style={styles.headerButton}
                onPress={closeSheet}
                hitSlop={8}
              >
                <Text style={styles.headerButtonText}>✕</Text>
              </Pressable>
              <Text style={styles.title}>
                コメント（{formatPoint(song.commentCount)}）
              </Text>
              <Pressable
                style={styles.headerButton}
                onPress={() =>
                  animateTo(
                    snapState === "full"
                      ? snapSizesRef.current.half
                      : snapSizesRef.current.full,
                  )
                }
                hitSlop={8}
              >
                <Text style={styles.headerButtonText}>
                  {snapState === "full" ? "⌄" : "⌃"}
                </Text>
              </Pressable>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator color={Colors.accent} style={styles.loading} />
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              renderItem={renderComment}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              onEndReached={loadMore}
              onEndReachedThreshold={0.3}
              ListEmptyComponent={
                <Text style={styles.empty}>
                  まだコメントはありません。最初のコメントを書いてみよう！
                </Text>
              }
              ListFooterComponent={
                loadingMore ? (
                  <ActivityIndicator color={Colors.accent} style={styles.footer} />
                ) : hasMore ? (
                  <Text style={styles.footerText}>スクロールしてさらに読み込む</Text>
                ) : comments.length > 0 ? (
                  <Text style={styles.footerText}>これ以上コメントはありません</Text>
                ) : null
              }
            />
          )}

          {error && <Text style={styles.error}>{error}</Text>}

          {profile ? (
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={setText}
                placeholder="コメントを追加..."
                placeholderTextColor={Colors.textFaint}
                maxLength={300}
                multiline
              />
              <Pressable
                style={[
                  styles.sendButton,
                  (!text.trim() || posting) && styles.sendButtonDisabled,
                ]}
                onPress={handlePost}
                disabled={!text.trim() || posting}
              >
                <Text style={styles.sendButtonText}>
                  {posting ? "..." : "送信"}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.loginNote}>コメントするにはログインしてください</Text>
          )}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    backgroundColor: "#0F172A",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderColor: Colors.cardBorder,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    overflow: "hidden",
  },
  dragArea: {
    paddingTop: 6,
    paddingBottom: 10,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: Colors.cardBorder,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: Colors.card,
    borderColor: Colors.cardBorder,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerButtonText: {
    color: Colors.textMuted,
    fontSize: 15,
    fontWeight: "700",
  },
  title: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    flex: 1,
  },
  loading: {
    paddingVertical: 40,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 8,
  },
  empty: {
    color: Colors.textFaint,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 32,
    lineHeight: 20,
  },
  footer: {
    paddingVertical: 12,
  },
  footerText: {
    color: Colors.textFaint,
    fontSize: 11,
    textAlign: "center",
    paddingVertical: 12,
  },
  commentItem: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(31, 41, 55, 0.6)",
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  commentBody: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  commentAuthor: {
    color: Colors.accentSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  commentDate: {
    color: Colors.textFaint,
    fontSize: 11,
  },
  commentText: {
    color: Colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  error: {
    color: Colors.down,
    fontSize: 12,
    marginTop: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 10,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.input,
    color: Colors.text,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    maxHeight: 90,
  },
  sendButton: {
    backgroundColor: Colors.accent,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  loginNote: {
    color: Colors.textFaint,
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
  },
});
