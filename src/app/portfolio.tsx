import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { HoldingCard } from "@/components/portfolio/HoldingCard";
import { AppCard } from "@/components/ui/AppCard";
import { Screen } from "@/components/ui/Screen";
import { Colors } from "@/constants/colors";
import { useAuthUser } from "@/hooks/use-auth-user";
import { formatPoint, formatSigned } from "@/lib/format";
import {
  getPortfolioSummary,
  type PortfolioSummary,
} from "@/services/getPortfolioSummary";

export default function PortfolioScreen() {
  const { firebaseUser } = useAuthUser();
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!firebaseUser) {
        return;
      }
      let active = true;

      getPortfolioSummary(firebaseUser.uid)
        .then((data) => {
          if (active) {
            setSummary(data);
          }
        })
        .catch(console.error)
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });

      return () => {
        active = false;
      };
    }, [firebaseUser]),
  );

  const todayColor =
    (summary?.todayChange ?? 0) > 0
      ? Colors.up
      : (summary?.todayChange ?? 0) < 0
        ? Colors.down
        : Colors.textMuted;

  return (
    <Screen
      title="ポートフォリオ"
      subtitle="保有している楽曲株とポイントを確認しよう。"
      showBottomNav
    >
      {loading || !summary ? (
        <ActivityIndicator color={Colors.accent} />
      ) : (
        <>
          <AppCard style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>総資産</Text>
            <Text style={styles.totalAssets}>
              {formatPoint(summary.totalAssets)} pt
            </Text>
            <Text style={[styles.todayChange, { color: todayColor }]}>
              前回比 {formatSigned(summary.todayChange)}pt
            </Text>

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>保有ポイント</Text>
                <Text style={styles.summaryItemValue}>
                  {formatPoint(summary.pointBalance)}pt
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>楽曲株の評価額</Text>
                <Text style={styles.summaryItemValue}>
                  {formatPoint(summary.holdingsValue)}pt
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>評価損益</Text>
                <Text
                  style={[
                    styles.summaryItemValue,
                    {
                      color:
                        summary.totalProfitLoss > 0
                          ? Colors.up
                          : summary.totalProfitLoss < 0
                            ? Colors.down
                            : Colors.text,
                    },
                  ]}
                >
                  {formatSigned(summary.totalProfitLoss)}pt
                </Text>
              </View>
            </View>
          </AppCard>

          <Text style={styles.sectionTitle}>保有楽曲</Text>
          {summary.items.length === 0 ? (
            <Text style={styles.empty}>
              まだ楽曲株を保有していません。楽曲一覧から探してみよう。
            </Text>
          ) : (
            summary.items.map((item) => (
              <HoldingCard key={item.holding.id} item={item} />
            ))
          )}

          <Text style={styles.disclaimer}>
            ※ポイント・楽曲株は現金化できません。評価額はアプリ内でのみ有効です。
          </Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    marginBottom: 20,
  },
  summaryLabel: {
    color: Colors.textMuted,
    fontSize: 13,
    marginBottom: 6,
  },
  totalAssets: {
    color: Colors.text,
    fontSize: 34,
    fontWeight: "800",
  },
  todayChange: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    paddingTop: 12,
  },
  summaryItem: {
    flex: 1,
  },
  summaryItemLabel: {
    color: Colors.textFaint,
    fontSize: 11,
    marginBottom: 4,
  },
  summaryItemValue: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  sectionTitle: {
    color: Colors.accentSoft,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 10,
  },
  empty: {
    color: Colors.textFaint,
    fontSize: 13,
    paddingVertical: 24,
    textAlign: "center",
  },
  disclaimer: {
    color: Colors.textFaint,
    fontSize: 11,
    marginTop: 16,
  },
});
