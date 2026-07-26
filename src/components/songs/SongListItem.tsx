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
   * row  …… 区切り線で並ぶフラットな行（スマホ既定）
   * tile …… 画面が広いときのタイル
   */
  variant?: "row" | "tile";
  /** 一覧の最終行だけ区切り線を消す */
  isLast?: boolean;
};

/**
 * 楽曲一覧の1件。
 *
 * カードを敷かず、白地にヘアラインで区切るフラットな行にしている
 * （TradingView のウォッチリストと同じ構造）。
 * 一覧で最も見たい情報は価格と騰落なので、右側に大きく寄せる。
 */
export function SongListItem({
  song,
  variant = "row",
  isLast = false,
}: SongListItemProps) {
  const changeRate = calculatePriceChangeRate(song);
  const rising = changeRate > 0;
  const falling = changeRate < 0;
  const changeColor = rising ? Colors.up : falling ? Colors.down : Colors.textMuted;
  const diff = song.currentPrice - (song.previousPrice ?? song.currentPrice);
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
        <Text style={styles.tilePrice}>
          {formatPoint(song.currentPrice)}
          <Text style={styles.unit}> pt</Text>
        </Text>
        <Text style={[styles.change, { color: changeColor }]}>
          {diff >= 0 ? "+" : "−"}
          {formatPoint(Math.abs(diff))} {formatRate(changeRate)}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowDivider,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <SongJacket jacketUrl={song.jacketUrl} title={song.title} size={44} />
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
        <Text style={[styles.change, { color: changeColor }]}>
          {diff >= 0 ? "+" : "−"}
          {formatPoint(Math.abs(diff))} {formatRate(changeRate)}
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
    paddingVertical: 12,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.cardBorder,
  },
  tile: {
    flex: 1,
    backgroundColor: Colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.cardBorder,
    borderRadius: 14,
    padding: 12,
  },
  pressed: {
    opacity: 0.6,
  },
  info: {
    flex: 1,
  },
  title: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  tileTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 2,
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
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  tilePrice: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginTop: 10,
  },
  unit: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  change: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
});
