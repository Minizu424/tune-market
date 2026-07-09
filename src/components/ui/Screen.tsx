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

type ScreenProps = {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  showBottomNav?: boolean;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

export function Screen({
  title,
  subtitle,
  children,
  showBottomNav = false,
  scroll = true,
  contentStyle,
}: ScreenProps) {
  const content = (
    <View style={[styles.content, showBottomNav && styles.withBottomNav, contentStyle]}>
      {title && <Text style={styles.title}>{title}</Text>}
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {children}
    </View>
  );

  return (
    <View style={styles.root}>
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
    backgroundColor: "#061226",
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 32,
  },
  withBottomNav: {
    paddingBottom: 110,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
});