import { StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";

type ProgressBarProps = {
  progress: number; // 0-100
  showLabel?: boolean;
};

export function ProgressBar({ progress, showLabel = true }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, progress));

  return (
    <View style={styles.row}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped}%` }]} />
      </View>
      {showLabel && <Text style={styles.label}>{clamped}%</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: Colors.cardBorder,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: Colors.accent,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    width: 38,
    textAlign: "right",
  },
});
