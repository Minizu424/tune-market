import { Text } from "react-native";

import { Screen } from "@/components/ui/Screen";

export default function SongsScreen() {
  return (
    <Screen
      title="楽曲一覧"
      subtitle="気になる楽曲を探して、詳細を確認しよう。"
      showBottomNav
    >
      <Text style={{ color: "#FFFFFF" }}>楽曲一覧画面</Text>
    </Screen>
  );
}