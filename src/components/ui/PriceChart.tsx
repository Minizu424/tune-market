import { StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";

type PriceChartProps = {
  prices: number[];
  height?: number;
};

/**
 * 追加ライブラリなしで描画する簡易価格チャート（バー表示）。
 * priceHistories の価格配列を時系列順で渡す。
 */
export function PriceChart({ prices, height = 120 }: PriceChartProps) {
  if (prices.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>価格履歴はまだありません</Text>
      </View>
    );
  }

  // 表示するのは直近30件。最小・最大も表示範囲で取らないとスケールが合わない。
  const visible = prices.slice(-30);
  const max = Math.max(...visible);
  const min = Math.min(...visible);
  const range = max - min || 1;
  const rising = visible[visible.length - 1] >= visible[0];

  return (
    <View>
      <View style={[styles.chart, { height }]}>
        {visible.map((price, index) => {
          const ratio = 0.15 + (0.85 * (price - min)) / range;
          const isLast = index === visible.length - 1;
          return (
            <View
              key={index}
              style={[
                styles.bar,
                {
                  height: height * ratio,
                  backgroundColor: isLast
                    ? Colors.text
                    : rising
                      ? "rgba(18, 128, 92, 0.45)"
                      : "rgba(196, 52, 43, 0.40)",
                },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.axis}>
        <Text style={styles.axisText}>安値 {min}pt</Text>
        <Text style={styles.axisText}>高値 {max}pt</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  bar: {
    flex: 1,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  axis: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  axisText: {
    color: Colors.textFaint,
    fontSize: 11,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.card,
    borderRadius: 12,
  },
  emptyText: {
    color: Colors.textFaint,
    fontSize: 12,
  },
});
