import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";
import type { Song } from "@/types";
import { SongJacket } from "@/components/songs/SongJacket";

type RankingItemProps = {
  rank: number;
  song: Song;
  value: string;
  valueColor?: string;
  subValue?: string;
};

const RANK_COLORS: Record<number, string> = {
  1: Colors.gold,
  2: "#CBD5E1",
  3: "#D97706",
};

export function RankingItem({ rank, song, value, valueColor, subValue }: RankingItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={() => router.push(`/songs/${song.id}`)}
    >
      <Text style={[styles.rank, { color: RANK_COLORS[rank] ?? Colors.textMuted }]}>
        {rank}
      </Text>
      <SongJacket jacketUrl={song.jacketUrl} title={song.title} size={44} />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {song.artistName} ・ {song.genre}
        </Text>
      </View>
      <View style={styles.valueBlock}>
        <Text style={[styles.value, valueColor ? { color: valueColor } : null]}>
          {value}
        </Text>
        {subValue ? <Text style={styles.subValue}>{subValue}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  rank: {
    width: 24,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
  },
  info: {
    flex: 1,
  },
  title: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 3,
  },
  meta: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  valueBlock: {
    alignItems: "flex-end",
  },
  value: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  subValue: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
});
