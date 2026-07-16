import { router, usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Colors } from "@/constants/colors";
import { usePlayback } from "@/contexts/PlaybackContext";

const PLAYER_SIZE = 150;
const DRAG_THRESHOLD = 6;

/**
 * YouTube風のフローティングミニプレイヤー。
 * ジャケットが見える正方形カードで、ドラッグして好きな位置に動かせる。
 * タップで楽曲詳細へ、⏸/▶で再生切り替え、✕で停止。
 * ネイティブはPanResponder、WebはDOMのポインターイベントでドラッグする。
 */
export function MiniPlayer() {
  const pathname = usePathname();
  const { currentSong, isPlaying, toggle, stop } = usePlayback();

  // ドラッグ位置（画面遷移しても保持される）
  const pan = useRef(new Animated.ValueXY()).current;
  const wrapperRef = useRef<View>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const draggedRef = useRef(false);

  // ネイティブ用ドラッグ
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dx) > DRAG_THRESHOLD ||
        Math.abs(gesture.dy) > DRAG_THRESHOLD,
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

  const visible = Boolean(currentSong) && pathname !== "/home" && pathname !== "/";

  // Web用ドラッグ（react-native-webはPanResponderをマウスに変換しないため）
  useEffect(() => {
    if (Platform.OS !== "web" || !visible) {
      return;
    }
    const node = wrapperRef.current as unknown as HTMLElement | null;
    if (!node || typeof node.addEventListener !== "function") {
      return;
    }

    let dragState: { startX: number; startY: number; baseX: number; baseY: number } | null =
      null;

    const onPointerDown = (event: PointerEvent) => {
      dragState = {
        startX: event.clientX,
        startY: event.clientY,
        baseX: offsetRef.current.x,
        baseY: offsetRef.current.y,
      };
      draggedRef.current = false;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragState) {
        return;
      }
      const dx = event.clientX - dragState.startX;
      const dy = event.clientY - dragState.startY;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        draggedRef.current = true;
      }
      if (draggedRef.current) {
        pan.setValue({ x: dragState.baseX + dx, y: dragState.baseY + dy });
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!dragState) {
        return;
      }
      if (draggedRef.current) {
        offsetRef.current = {
          x: dragState.baseX + (event.clientX - dragState.startX),
          y: dragState.baseY + (event.clientY - dragState.startY),
        };
      }
      dragState = null;
    };

    node.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      node.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [visible, pan]);

  if (!visible || !currentSong) {
    return null;
  }

  // ドラッグ直後のclickをタップとして扱わないためのガード
  const guardPress = (action: () => void) => () => {
    if (draggedRef.current) {
      return;
    }
    action();
  };

  return (
    <Animated.View
      ref={wrapperRef}
      style={[styles.wrapper, { transform: pan.getTranslateTransform() }]}
      {...panResponder.panHandlers}
    >
      <Pressable
        style={styles.card}
        onPress={guardPress(() => router.push(`/songs/${currentSong.id}`))}
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

        <Pressable style={styles.closeButton} onPress={guardPress(stop)} hitSlop={8}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>

        <Pressable style={styles.playButton} onPress={guardPress(toggle)} hitSlop={8}>
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
