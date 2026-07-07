import { Text } from "react-native";

import { Screen } from "@/components/ui/Screen";

export default function RankingScreen() {
  return (
    <Screen
      title="ランキング"
      subtitle="週間応援ランキングや急上昇銘柄を確認しよう。"
      showBottomNav
    >
      <Text style={{ color: "#FFFFFF" }}>ランキング画面</Text>
    </Screen>
  );
}