import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";
import { formatPoint, formatRate } from "@/lib/format";
import { calculatePriceChangeRate } from "@/repositories/songsRepository";
import type { Song } from "@/types";
import { SongJacket } from "./SongJacket";

type SongListItemProps = {
  song: Song;
  /**
   * row  …… スマホ向けの横1行
   * tile …… 画面が広いときのタイル。ジャケットを大きく見せる
   */
  variant?: "row" | "tile";
};

/** 騰落率を色付きのピルで表示する。一覧で一番見たい情報なので目立たせる。 */
function ChangePill({ changeRate }: { changeRate: number }) {
  const rising = changeRate > 0;
  const falling = changeRate < 0;
  const color = rising ? Colors.up : falling ? Colors.down : Colors.textMuted;
  const background = rising
    ? "rgba(15, 110, 86, 0.10)"
    : falling
      ? "rgba(179, 56, 43, 0.10)"
      : "rgba(95, 92, 85, 0.08)";

  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
      <Text style={[styles.pillText, { color }]}>
        {rising ? "▲" : falling ? "▼" : "－"} {formatRate(changeRate).replace(/^[+-]/, "")}
      </Text>
    </View>
  );
}

export function SongListItem({ song, variant = "row" }: SongListItemProps) {
  const changeRate = calculatePriceChangeRate(song);
  const onPress = () => router.push(`/songs/${song.id}`);

  if (variant === "tile") {
    return (
      <Pressable
        style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
        onPress={onPress}
      >
        <SongJacket jacketUrl={song.jacketUrl} title={song.title} fill />
        <Text style={styles.tileTitle} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {song.artistName} ・ {song.genre}
        </Text>
        <View style={styles.tilePriceRow}>
          <Text style={styles.tilePrice}>
            {formatPoint(song.currentPrice)}
            <Text style={styles.unit}> pt</Text>
          </Text>
          <ChangePill changeRate={changeRate} />
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPress}
    >
      <SongJacket jacketUrl={song.jacketUrl} title={song.title} size={56} />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {song.artistName} ・ {song.genre}
        </Text>
      </View>
      <View style={styles.priceBlock}>
        <Text style={styles.price}>
          {formatPoint(song.currentPrice)}
          <Text style={styles.unit}> pt</Text>
        </Text>
        <ChangePill changeRate={changeRate} />
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
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  tile: {
    flex: 1,
    backgroundColor: Colors.card,
    borderColor: Colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
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
  tileTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 3,
  },
  meta: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  priceBlock: {
    alignItems: "flex-end",
    gap: 5,
  },
  price: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  tilePriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  tilePrice: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  unit: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "800",
  },
});
