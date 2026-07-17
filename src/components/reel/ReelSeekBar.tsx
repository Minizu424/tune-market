import { useAudioPlayerStatus } from "expo-audio";
import { StyleSheet, Text, View, type GestureResponderEvent } from "react-native";
import { Colors } from "@/constants/colors";
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
 * このコンポーネントだけがplayerのステータスを購読するので、
 * 0.5秒ごとの再生位置更新でリール全体が再描画されることはない。
 */
export function ReelSeekBar({ expanded }: ReelSeekBarProps) {
  const { player } = usePlayback();
  const status = useAudioPlayerStatus(player);

  const duration = status.duration || 0;
  const progress = duration > 0 ? Math.min(1, status.currentTime / duration) : 0;

  const seekToEvent = (event: GestureResponderEvent, barWidth: number) => {
    if (duration <= 0 || barWidth <= 0) {
      return;
    }
    const ratio = Math.max(0, Math.min(1, event.nativeEvent.locationX / barWidth));
    player.seekTo(ratio * duration).catch(console.error);
  };

  let barWidth = 0;

  return (
    <View style={styles.container} pointerEvents={expanded ? "auto" : "none"}>
      {expanded && (
        <View style={styles.timeRow}>
          <Text style={styles.time}>{formatTime(status.currentTime)}</Text>
          <Text style={styles.time}>{formatTime(duration)}</Text>
        </View>
      )}
      <View
        style={[styles.track, expanded && styles.trackExpanded]}
        onLayout={(event) => {
          barWidth = event.nativeEvent.layout.width;
        }}
        onStartShouldSetResponder={() => expanded}
        onMoveShouldSetResponder={() => expanded}
        onResponderGrant={(event) => seekToEvent(event, barWidth)}
        onResponderMove={(event) => seekToEvent(event, barWidth)}
      >
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        {expanded && (
          <View style={[styles.knob, { left: `${progress * 100}%` }]} />
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
    marginBottom: 6,
  },
  time: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 4,
  },
  track: {
    height: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
  },
  trackExpanded: {
    height: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 999,
    paddingHorizontal: 0,
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
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    marginLeft: -7,
  },
});
