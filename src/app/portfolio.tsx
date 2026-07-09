import { Text } from "react-native";

import { Screen } from "@/components/ui/Screen";

export default function PortfolioScreen() {
  return (
    <Screen
      title="ポートフォリオ"
      subtitle="保有している楽曲株とポイントを確認しよう。"
      showBottomNav
    >
      <Text style={{ color: "#FFFFFF" }}>ポートフォリオ画面</Text>
    </Screen>
  );
}