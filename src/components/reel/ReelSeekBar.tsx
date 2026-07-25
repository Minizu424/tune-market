import { useAudioPlayerStatus } from "expo-audio";
import { useRef, useState } from "react";
import { PanResponder, StyleSheet, Text, View } from "react-native";
import { OverlayColors as Colors } from "@/constants/colors";
import { usePlayback } from "@/contexts/PlaybackContext";

type ReelSeekBarProps = {
  /** 一時停止中は太いバー+時間表示、再生中は細いバーだけ */
  expanded: boolean;
};

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * リール下部のシークバー。
 * ドラッグ中はローカルの表示位置だけを動かし、指を離した瞬間に1回だけ
 * seekTo する（ドラッグのたびにシークすると引っかかるため）。
 */
export function ReelSeekBar({ expanded }: ReelSeekBarProps) {
  const { player } = usePlayback();
  const status = useAudioPlayerStatus(player);

  const barWidthRef = useRef(0);
  const [dragRatio, setDragRatio] = useState<number | null>(null);
  const dragRatioRef = useRef<number | null>(null);

  const duration = status.duration || 0;
  const statusRatio =
    duration > 0 ? Math.min(1, status.currentTime / duration) : 0;
  // ドラッグ中はドラッグ位置を優先して表示
  const ratio = dragRatio ?? statusRatio;

  const ratioFromX = (x: number) => {
    const width = barWidthRef.current;
    if (width <= 0) {
      return 0;
    }
    return Math.max(0, Math.min(1, x / width));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // リール（縦FlatList）に奪われないようにする
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => {
        const next = ratioFromX(event.nativeEvent.locationX);
        dragRatioRef.current = next;
        setDragRatio(next);
      },
      onPanResponderMove: (event) => {
        const next = ratioFromX(event.nativeEvent.locationX);
        dragRatioRef.current = next;
        setDragRatio(next);
      },
      onPanResponderRelease: () => {
        const finalRatio = dragRatioRef.current;
        dragRatioRef.current = null;
        if (finalRatio != null) {
          player.seekTo(finalRatio * (player.duration || 0)).catch(console.error);
        }
        // シーク完了までドラッグ位置を表示し続け、少し後に実位置へ戻す
        setTimeout(() => setDragRatio(null), 350);
      },
      onPanResponderTerminate: () => {
        dragRatioRef.current = null;
        setDragRatio(null);
      },
    }),
  ).current;

  return (
    <View style={styles.container} pointerEvents={expanded ? "auto" : "none"}>
      {expanded && (
        <View style={styles.timeRow}>
          <Text style={styles.time}>
            {formatTime(ratio * duration)}
          </Text>
          <Text style={styles.time}>{formatTime(duration)}</Text>
        </View>
      )}

      {/* 当たり判定を広めに取ったドラッグ領域 */}
      <View
        style={styles.touchArea}
        onLayout={(event) => {
          barWidthRef.current = event.nativeEvent.layout.width;
        }}
        {...(expanded ? panResponder.panHandlers : {})}
      >
        <View style={[styles.track, expanded && styles.trackExpanded]}>
          <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
        </View>
        {expanded && (
          <View style={[styles.knob, { left: `${ratio * 100}%` }]} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 78,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  time: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 4,
  },
  touchArea: {
    height: 32,
    justifyContent: "center",
  },
  track: {
    height: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  trackExpanded: {
    height: 8,
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: Colors.accent,
  },
  knob: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    marginLeft: -9,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
});
