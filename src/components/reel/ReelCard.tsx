import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Colors } from "@/constants/colors";
import { formatPoint, formatRate } from "@/lib/format";
import { calculatePriceChangeRate } from "@/repositories/songsRepository";
import type { Song } from "@/types";

type ReelCardProps = {
  song: Song;
  height: number;
  isActive: boolean;
  weeklyRank?: number;
  isLiked: boolean;
  /** タグごとのフィルター状態（含む/除外） */
  tagStates?: Record<string, "include" | "exclude">;
  onPressTag?: (tag: string) => void;
  onPressLike: () => void;
  onPressComments: () => void;
  onPressBuy: () => void;
  onPressSupport: () => void;
};

/**
 * リール1枚分のカード。1曲を全画面で表示する。
 * 背景に jacketUrl、前面に価格・応援pt・保有者数・進捗とアクションを重ねる。
 */
export function ReelCard({
  song,
  height,
  isActive,
  weeklyRank,
  isLiked,
  tagStates,
  onPressTag,
  onPressLike,
  onPressComments,
  onPressBuy,
  onPressSupport,
}: ReelCardProps) {
  const changeRate = calculatePriceChangeRate(song);
  const changeColor =
    changeRate > 0 ? Colors.up : changeRate < 0 ? Colors.down : Colors.textMuted;

  return (
    <View style={[styles.card, { height }]}>
      {song.jacketUrl ? (
        <Image
          source={{ uri: song.jacketUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={300}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallbackBg]} />
      )}
      <View style={[StyleSheet.absoluteFill, styles.dim]} />
      <View style={styles.bottomShade} />

      {weeklyRank != null && weeklyRank <= 3 && (
        <View style={styles.rankBadge}>
          <Text style={styles.rankBadgeText}>週間応援 {weeklyRank}位</Text>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          style={[styles.actionButton, isLiked && styles.likedButton]}
          onPress={onPressLike}
        >
          <Text style={styles.actionIcon}>{isLiked ? "❤️" : "🤍"}</Text>
          <Text style={styles.actionLabel}>{formatPoint(song.likeCount)}</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={onPressComments}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionLabel}>{formatPoint(song.commentCount)}</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, styles.buyButton]} onPress={onPressBuy}>
          <Text style={styles.actionIcon}>📈</Text>
          <Text style={styles.actionLabel}>買う</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.supportButton]}
          onPress={onPressSupport}
        >
          <Text style={styles.actionIcon}>🎉</Text>
          <Text style={styles.actionLabel}>応援</Text>
        </Pressable>
        <Pressable
          style={styles.actionButton}
          onPress={() => router.push(`/songs/${song.id}`)}
        >
          <Text style={styles.actionIcon}>ℹ️</Text>
          <Text style={styles.actionLabel}>詳細</Text>
        </Pressable>
      </View>

      <View style={styles.info}>
        <View style={styles.chipRow}>
          <View style={styles.genreChip}>
            <Text style={styles.genreChipText}>{song.genre}</Text>
          </View>
          <Text style={styles.playingText}>
            {song.audioUrl ? (isActive ? "♪ 再生中" : "") : "音源準備中"}
          </Text>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {song.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {song.artistName}
        </Text>

        {song.tags && song.tags.length > 0 && (
          <View style={styles.tagRow}>
            {song.tags.map((tag) => {
              const mode = tagStates?.[tag];
              return (
                <Pressable
                  key={tag}
                  style={[
                    styles.tagChip,
                    mode === "include" && styles.tagChipInclude,
                    mode === "exclude" && styles.tagChipExclude,
                  ]}
                  onPress={() => onPressTag?.(tag)}
                >
                  <Text style={styles.tagChipText}>
                    {mode === "exclude" ? `✕ #${tag}` : `#${tag}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPoint(song.currentPrice)} pt</Text>
          <Text style={[styles.change, { color: changeColor }]}>
            {formatRate(changeRate)}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <Text style={styles.stat}>応援 {formatPoint(song.supportPoint)}pt</Text>
          <Text style={styles.stat}>保有者 {formatPoint(song.holderCount)}人</Text>
        </View>

        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>制作進捗</Text>
          <View style={styles.progressBar}>
            <ProgressBar progress={song.progress} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: "#000000",
    overflow: "hidden",
  },
  fallbackBg: {
    backgroundColor: "#1E1B4B",
  },
  dim: {
    backgroundColor: "rgba(2, 6, 23, 0.35)",
  },
  bottomShade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "45%",
    backgroundColor: "rgba(2, 6, 23, 0.55)",
  },
  rankBadge: {
    position: "absolute",
    top: 60,
    left: 20,
    backgroundColor: "rgba(251, 191, 36, 0.9)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  rankBadgeText: {
    color: "#1F2937",
    fontSize: 12,
    fontWeight: "800",
  },
  actions: {
    position: "absolute",
    right: 14,
    bottom: 170,
    alignItems: "center",
    gap: 14,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  buyButton: {
    backgroundColor: "rgba(139, 92, 246, 0.9)",
    borderColor: Colors.accent,
  },
  likedButton: {
    backgroundColor: "rgba(236, 72, 153, 0.35)",
    borderColor: "#EC4899",
  },
  supportButton: {
    backgroundColor: "rgba(245, 158, 11, 0.9)",
    borderColor: "#F59E0B",
  },
  actionIcon: {
    fontSize: 18,
  },
  actionLabel: {
    color: Colors.text,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 1,
  },
  info: {
    position: "absolute",
    left: 20,
    right: 90,
    bottom: 110,
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  genreChip: {
    backgroundColor: "rgba(139, 92, 246, 0.85)",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  genreChipText: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: "800",
  },
  playingText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  title: {
    color: Colors.text,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
  },
  artist: {
    color: "#D1D5DB",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  tagChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.5)",
    backgroundColor: "rgba(2, 6, 23, 0.45)",
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  tagChipInclude: {
    backgroundColor: "rgba(139, 92, 246, 0.9)",
    borderColor: Colors.accent,
  },
  tagChipExclude: {
    backgroundColor: "rgba(248, 113, 113, 0.85)",
    borderColor: Colors.down,
  },
  tagChipText: {
    color: Colors.accentSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginBottom: 6,
  },
  price: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  change: {
    fontSize: 14,
    fontWeight: "800",
  },
  statsRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 10,
  },
  stat: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  progressBar: {
    flex: 1,
  },
});
