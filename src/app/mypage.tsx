import { Text } from "react-native";

import { Screen } from "@/components/ui/Screen";

export default function MyPageScreen() {
  return (
    <Screen
      title="マイページ"
      subtitle="ポイントやアーティスト登録を確認しよう。"
      showBottomNav
    >
      <Text style={{ color: "#FFFFFF" }}>マイページ画面</Text>
    </Screen>
  );
}