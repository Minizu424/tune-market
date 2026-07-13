import { Timestamp, type QueryDocumentSnapshot } from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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
          pointerEvents="box-none"
        >
          <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>
            コメント（{formatPoint(song.commentCount)}）
          </Text>

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
          </View>
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
    maxHeight: "75%",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: Colors.cardBorder,
    marginBottom: 12,
  },
  title: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },
  loading: {
    paddingVertical: 40,
  },
  list: {
    flexGrow: 0,
    flexShrink: 1,
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
