import { router, usePathname, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";

type NavItem = {
  label: string;
  href: Href;
  match: string;
};

const navItems: NavItem[] = [
  {
    label: "ホーム",
    href: "/home",
    match: "/home",
  },
  {
    label: "楽曲",
    href: "/songs",
    match: "/songs",
  },
  {
    label: "資産",
    href: "/portfolio",
    match: "/portfolio",
  },
  {
    label: "ランキング",
    href: "/ranking",
    match: "/ranking",
  },
  {
    label: "マイページ",
    href: "/mypage",
    match: "/mypage",
  },
];

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
            style={[styles.item, isActive && styles.activeItem]}
          >
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
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: Colors.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  item: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
  },
  activeItem: {
    backgroundColor: Colors.accent,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  activeLabel: {
    color: Colors.onAccent,
  },
});