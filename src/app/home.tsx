import { StyleSheet, Text } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { Screen } from "@/components/ui/Screen";

export default function HomeScreen() {
  return (
    <Screen
      title="Tune Market"
      subtitle="将来伸びる楽曲を見つけて、ポイントで応援しよう。"
      showBottomNav
    >
      <AppCard style={styles.card}>
        <Text style={styles.cardLabel}>保有ポイント</Text>
        <Text style={styles.point}>100 pt</Text>
      </AppCard>

      <AppCard style={styles.card}>
        <Text style={styles.cardTitle}>急上昇銘柄</Text>
        <Text style={styles.songTitle}>Night Drive</Text>
        <Text style={styles.songMeta}>Taro Beats / Lo-fi / 128pt</Text>
      </AppCard>

      <AppButton title="楽曲を探す" onPress={() => {}} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  cardLabel: {
    color: "#94A3B8",
    fontSize: 13,
    marginBottom: 6,
  },
  point: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
  },
  cardTitle: {
    color: "#A78BFA",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },
  songTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  songMeta: {
    color: "#94A3B8",
    fontSize: 13,
  },
});