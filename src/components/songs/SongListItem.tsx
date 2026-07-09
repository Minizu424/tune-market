import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";
import { formatPoint, formatRate } from "@/lib/format";
import { calculatePriceChangeRate } from "@/repositories/songsRepository";
import type { Song } from "@/types";
import { SongJacket } from "./SongJacket";

type SongListItemProps = {
  song: Song;
};

export function SongListItem({ song }: SongListItemProps) {
  const changeRate = calculatePriceChangeRate(song);
  const changeColor =
    changeRate > 0 ? Colors.up : changeRate < 0 ? Colors.down : Colors.textMuted;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={() => router.push(`/songs/${song.id}`)}
    >
      <SongJacket jacketUrl={song.jacketUrl} title={song.title} />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {song.artistName} ・ {song.genre}
        </Text>
      </View>
      <View style={styles.priceBlock}>
        <Text style={styles.price}>{formatPoint(song.currentPrice)}pt</Text>
        <Text style={[styles.change, { color: changeColor }]}>
          {formatRate(changeRate)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.card,
    borderColor: Colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  pressed: {
    opacity: 0.75,
  },
  info: {
    flex: 1,
  },
  title: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 3,
  },
  meta: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  priceBlock: {
    alignItems: "flex-end",
  },
  price: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 3,
  },
  change: {
    fontSize: 12,
    fontWeight: "700",
  },
});
