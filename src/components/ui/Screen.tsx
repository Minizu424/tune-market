import { ReactNode } from "react";
import {
    ScrollView,
    StyleProp,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from "react-native";

import { BottomNav } from "@/components/navigation/BottomNav";
import { useSwipeTabs } from "@/hooks/use-swipe-tabs";
import { CONTENT_MAX_WIDTH } from "@/hooks/use-layout";
import { Colors } from "@/constants/colors";

type ScreenProps = {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  showBottomNav?: boolean;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /**
   * 中身の最大幅。既定は読みやすさ優先の1カラム幅。
   * 一覧をタイルで並べる画面は GRID_MAX_WIDTH を渡して広げる。
   */
  maxWidth?: number;
};

export function Screen({
  title,
  subtitle,
  children,
  showBottomNav = false,
  scroll = true,
  contentStyle,
  maxWidth = CONTENT_MAX_WIDTH,
}: ScreenProps) {
  // 下タブのある画面は横スワイプでも隣のタブへ移動できる
  const swipeHandlers = useSwipeTabs();

  const content = (
    <View
      style={[
        styles.content,
        { maxWidth },
        showBottomNav && styles.withBottomNav,
        contentStyle,
      ]}
    >
      {title && <Text style={styles.title}>{title}</Text>}
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {children}
    </View>
  );

  return (
    <View style={styles.root} {...(showBottomNav ? swipeHandlers : {})}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {content}
        </ScrollView>
      ) : (
        content
      )}

      {showBottomNav && <BottomNav />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    width: "100%",
    // 画面が広いときは中央に寄せる。Web で行が横に伸びきるのを防ぐ。
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 32,
  },
  withBottomNav: {
    paddingBottom: 104,
  },
  title: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
});