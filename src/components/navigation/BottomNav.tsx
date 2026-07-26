import { Ionicons } from "@expo/vector-icons";
import { router, usePathname, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

type NavItem = {
  label: string;
  href: Href;
  match: string;
  icon: IoniconName;
  activeIcon: IoniconName;
};

const navItems: NavItem[] = [
  { label: "ホーム", href: "/home", match: "/home", icon: "home-outline", activeIcon: "home" },
  { label: "楽曲", href: "/songs", match: "/songs", icon: "musical-notes-outline", activeIcon: "musical-notes" },
  { label: "資産", href: "/portfolio", match: "/portfolio", icon: "pie-chart-outline", activeIcon: "pie-chart" },
  { label: "ランキング", href: "/ranking", match: "/ranking", icon: "trending-up-outline", activeIcon: "trending-up" },
  { label: "マイページ", href: "/mypage", match: "/mypage", icon: "person-outline", activeIcon: "person" },
];

/**
 * 下タブ。
 * 浮いたピルではなく、画面下に貼り付く平たいバーにしている
 * （参考アプリはいずれもこの形。中身の面積を稼げて、現在地も分かりやすい）。
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <View style={styles.wrapper}>
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.match);

        return (
          <Pressable
            key={item.match}
            onPress={() => router.push(item.href)}
            style={styles.item}
          >
            <Ionicons
              name={isActive ? item.activeIcon : item.icon}
              size={22}
              color={isActive ? Colors.text : Colors.textFaint}
            />
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: Colors.card,
    borderTopWidth: 0.5,
    borderTopColor: Colors.cardBorder,
    paddingTop: 8,
    paddingBottom: 26,
  },
  item: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  label: {
    color: Colors.textFaint,
    fontSize: 10,
    fontWeight: "600",
  },
  activeLabel: {
    color: Colors.text,
    fontWeight: "800",
  },
});
