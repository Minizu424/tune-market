import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import { Colors } from "@/constants/colors";

type AppButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AppButton({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  style,
}: AppButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.text, VARIANT_TEXT_STYLES[variant]]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 999,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: Colors.accent,
  },
  secondary: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  text: {
    fontSize: 15,
    fontWeight: "700",
  },
  // 文字色はボタンの地の色ごとに変える。
  // 以前は全バリアントで白文字を使っていたが、ライト基調では
  // secondary（明るい地）の文字が消えるため分けている。
  primaryText: {
    color: Colors.onAccent,
  },
  secondaryText: {
    color: Colors.text,
  },
  ghostText: {
    color: Colors.accentSoft,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.45,
  },
});

const VARIANT_TEXT_STYLES = {
  primary: styles.primaryText,
  secondary: styles.secondaryText,
  ghost: styles.ghostText,
} as const;
