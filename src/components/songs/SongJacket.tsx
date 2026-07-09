import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";

type SongJacketProps = {
  jacketUrl?: string;
  title: string;
  size?: number;
};

const JACKET_COLORS = ["#7C3AED", "#2563EB", "#0D9488", "#DB2777", "#D97706", "#4F46E5"];

export function SongJacket({ jacketUrl, title, size = 52 }: SongJacketProps) {
  const radius = Math.max(10, size * 0.22);

  if (jacketUrl) {
    return (
      <Image
        source={{ uri: jacketUrl }}
        style={{ width: size, height: size, borderRadius: radius }}
        contentFit="cover"
      />
    );
  }

  const color = JACKET_COLORS[Math.abs(hashCode(title)) % JACKET_COLORS.length];

  return (
    <View
      style={[
        styles.placeholder,
        { width: size, height: size, borderRadius: radius, backgroundColor: color },
      ]}
    >
      <Text style={[styles.placeholderText, { fontSize: size * 0.4 }]}>♪</Text>
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
    color: "rgba(255,255,255,0.9)",
    fontWeight: "800",
  },
});
