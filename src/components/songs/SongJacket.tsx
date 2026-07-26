import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";

type SongJacketProps = {
  jacketUrl?: string;
  title: string;
  size?: number;
  /** 幅いっぱいの正方形にする（タイル表示用） */
  fill?: boolean;
};

// 音源にジャケットが無いときの代替色。写真の代わりなので彩度は保ちつつ、
// 白文字が載る前提でやや濃いめに揃えてある。
const JACKET_COLORS = ["#3F3F46", "#1F5F8B", "#12805C", "#8B3A62", "#8F5D08", "#4B4B7A"];

export function SongJacket({
  jacketUrl,
  title,
  size = 52,
  fill = false,
}: SongJacketProps) {
  const radius = fill ? 12 : Math.max(10, size * 0.22);
  const box = fill
    ? { width: "100%" as const, aspectRatio: 1, borderRadius: radius }
    : { width: size, height: size, borderRadius: radius };

  if (jacketUrl) {
    return (
      <Image source={{ uri: jacketUrl }} style={box} contentFit="cover" />
    );
  }

  const color = JACKET_COLORS[Math.abs(hashCode(title)) % JACKET_COLORS.length];

  return (
    <View style={[styles.placeholder, box, { backgroundColor: color }]}>
      <Text
        style={[styles.placeholderText, { fontSize: fill ? 44 : size * 0.4 }]}
      >
        ♪
      </Text>
    </View>
  );
}

function hashCode(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: "rgba(255,255,255,0.92)",
    fontWeight: "800",
  },
});
