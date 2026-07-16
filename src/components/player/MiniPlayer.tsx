import { router, usePathname } from "expo-router";
import { useRef } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Colors } from "@/constants/colors";
import { usePlayback } from "@/contexts/PlaybackContext";

const PLAYER_SIZE = 150;

/**
 * YouTube風のフローティングミニプレイヤー。
 * ジャケットが見える正方形カードで、ドラッグして好きな位置に動かせる。
 * タップで楽曲詳細へ、⏸/▶で再生切り替え、✕で停止。
 */
export function MiniPlayer() {
  const pathname = usePathname();
  const { currentSong, isPlaying, toggle, stop } = usePlayback();

  // ドラッグ位置（画面遷移しても保持される）
  const pan = useRef(new Animated.ValueXY()).current;
  const panResponder = useRef(
    PanResponder.create({
      // 少し動かしたときだけドラッグ扱いにする（タップはボタンに通す）
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dx) > 6 || Math.abs(gesture.dy) > 6,
      onPanResponderGrant: () => {
        pan.extractOffset();
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
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

        <Pressable
          style={styles.closeButton}
          onPress={stop}
          hitSlop={8}
        >
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
    right: 16,
    bottom: 96,
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
