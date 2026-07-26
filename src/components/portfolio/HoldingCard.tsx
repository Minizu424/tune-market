import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SongJacket } from "@/components/songs/SongJacket";
import { Colors } from "@/constants/colors";
import { formatPoint, formatQuantity, formatRate, formatSigned } from "@/lib/format";
import type { PortfolioItem } from "@/services/getPortfolioSummary";

type HoldingCardProps = {
  item: PortfolioItem;
};

export function HoldingCard({ item }: HoldingCardProps) {
  const { song, holding } = item;
  const plColor =
    item.profitLoss > 0 ? Colors.up : item.profitLoss < 0 ? Colors.down : Colors.textMuted;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => router.push(`/songs/${song.id}`)}
    >
      <View style={styles.row}>
        <SongJacket jacketUrl={song.jacketUrl} title={song.title} size={46} />
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {song.title}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {song.artistName} ・ {formatQuantity(holding.quantity)}
          </Text>
        </View>
        <View style={styles.valueBlock}>
          <Text style={styles.value}>{formatPoint(item.currentValue)}pt</Text>
          <Text style={[styles.profit, { color: plColor }]}>
            {formatSigned(item.profitLoss)}pt（{formatRate(item.profitLossRate)}）
          </Text>
        </View>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detail}>平均取得 {formatPoint(holding.averagePrice)}pt</Text>
        <Text style={styles.detail}>現在価格 {formatPoint(song.currentPrice)}pt</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.cardBorder,
    paddingVertical: 12,
  },
  pressed: {
    opacity: 0.6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  info: {
    flex: 1,
  },
  title: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 3,
  },
  meta: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  valueBlock: {
    alignItems: "flex-end",
  },
  value: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginBottom: 3,
  },
  profit: {
    fontSize: 13,
    fontWeight: "800",
  },
  detailRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  detail: {
    color: Colors.textFaint,
    fontSize: 11,
  },
});
