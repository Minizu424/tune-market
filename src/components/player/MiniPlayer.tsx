import { router, usePathname } from "expo-router";
import { useRef } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Colors } from "@/constants/colors";
import { usePlayback } from "@/contexts/PlaybackContext";

const PLAYER_SIZE = 150;
const SIDE_MARGIN = 16;
const TOP_MARGIN = 70; // ヘッダー・ステータスバーを避ける
const BOTTOM_MARGIN = 96; // 下タブナビを避ける
const DRAG_THRESHOLD = 6;

/**
 * YouTube風のフローティングミニプレイヤー。
 * ドラッグして離すと、YouTubeのPiPのように最寄りの四隅へスナップする。
 * 画面外に置きっぱなしにはならない（離した瞬間に必ず画面内の角へ戻る）。
 */
export function MiniPlayer() {
  const pathname = usePathname();
  const { currentSong, isPlaying, toggle, stop } = usePlayback();
  const { width, height } = useWindowDimensions();

  // ベース位置は右下（styles.wrapper）。そこからの移動量で四隅を表現する。
  const pan = useRef(new Animated.ValueXY()).current;
  const restRef = useRef({ x: 0, y: 0 }); // 直近でスナップした位置
  const cancelledRef = useRef(false); // マルチタッチでキャンセルしたか
  const dimsRef = useRef({ width, height });
  dimsRef.current = { width, height };

  // 現在位置から最寄りの角へスナップする（速度を渡すと投げた先を予測する）
  const snapToNearestCorner = (x: number, y: number, vx = 0, vy = 0) => {
    const { width: w, height: h } = dimsRef.current;
    const leftX = -(w - PLAYER_SIZE - SIDE_MARGIN * 2);
    const topY = -(h - PLAYER_SIZE - TOP_MARGIN - BOTTOM_MARGIN);

    const projectedX = x + vx * 200;
    const projectedY = y + vy * 200;
    const targetX = projectedX < leftX / 2 ? leftX : 0;
    const targetY = projectedY < topY / 2 ? topY : 0;

    restRef.current = { x: targetX, y: targetY };
    Animated.spring(pan, {
      toValue: { x: targetX, y: targetY },
      velocity: { x: vx, y: vy },
      friction: 6,
      tension: 30,
      useNativeDriver: false,
    }).start();
  };

  const snapRef = useRef(snapToNearestCorner);
  snapRef.current = snapToNearestCorner;

  const panResponder = useRef(
    PanResponder.create({
      // 少し動かしたときだけドラッグ扱いにする（タップはボタンに通す）
      onMoveShouldSetPanResponder: (_event, gesture) =>
        gesture.numberActiveTouches === 1 &&
        (Math.abs(gesture.dx) > DRAG_THRESHOLD ||
          Math.abs(gesture.dy) > DRAG_THRESHOLD),
      onPanResponderGrant: () => {
        cancelledRef.current = false;
      },
      onPanResponderMove: (_event, gesture) => {
        // 2本目の指が触れたら、その時点の位置から最寄りの角へスナップする
        if (gesture.numberActiveTouches > 1) {
          if (!cancelledRef.current) {
            cancelledRef.current = true;
            snapRef.current(
              restRef.current.x + gesture.dx,
              restRef.current.y + gesture.dy,
            );
          }
          return;
        }
        if (cancelledRef.current) {
          return;
        }
        pan.setValue({
          x: restRef.current.x + gesture.dx,
          y: restRef.current.y + gesture.dy,
        });
      },
      onPanResponderRelease: (_event, gesture) => {
        if (cancelledRef.current) {
          cancelledRef.current = false;
          return;
        }
        snapRef.current(
          restRef.current.x + gesture.dx,
          restRef.current.y + gesture.dy,
          gesture.vx,
          gesture.vy,
        );
      },
      onPanResponderTerminate: (_event, gesture) => {
        // ジェスチャーが中断されたら、その時点の位置から最寄りの角へ
        snapRef.current(
          restRef.current.x + gesture.dx,
          restRef.current.y + gesture.dy,
        );
      },
    }),
  ).current;

  // リール画面とログイン画面では表示しない
  if (!currentSong || pathname === "/home" || pathname === "/") {
    return null;
  }

  return (
    <Animated.View
      style={[styles.wrapper, { transform: pan.getTranslateTransform() }]}
      {...panResponder.panHandlers}
    >
      <Pressable
        style={styles.card}
        onPress={() => router.push(`/songs/${currentSong.id}`)}
      >
        {currentSong.jacketUrl ? (
          <Image
            source={{ uri: currentSong.jacketUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.fallbackBg]}>
            <Text style={styles.fallbackNote}>♪</Text>
          </View>
        )}

        <Pressable style={styles.closeButton} onPress={stop} hitSlop={8}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>

        <Pressable style={styles.playButton} onPress={toggle} hitSlop={8}>
          <Text style={styles.playText}>{isPlaying ? "⏸" : "▶"}</Text>
        </Pressable>

        <View style={styles.infoStrip}>
          <Text style={styles.title} numberOfLines={1}>
            {currentSong.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {currentSong.artistName}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    right: SIDE_MARGIN,
    bottom: BOTTOM_MARGIN,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
  },
  card: {
    flex: 1,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#171F35",
    borderColor: Colors.cardBorder,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  fallbackBg: {
    backgroundColor: "#1E1B4B",
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackNote: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 44,
    fontWeight: "800",
  },
  closeButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: "rgba(2, 6, 23, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  closeText: {
    color: Colors.text,
    fontSize: 12,
  },
  playButton: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: "rgba(2, 6, 23, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  playText: {
    color: Colors.text,
    fontSize: 12,
  },
  infoStrip: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(2, 6, 23, 0.72)",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  title: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 1,
  },
  artist: {
    color: Colors.textMuted,
    fontSize: 10,
  },
});
