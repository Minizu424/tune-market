import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useRef, useState } from "react";
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
  /** アクティブなリールが一時停止中か（▶アイコン表示用） */
  isPaused?: boolean;
  /** ジャケットのタップで再生/一時停止を切り替える */
  onTogglePlay?: () => void;
  /** タグごとのフィルター状態（含む/除外） */
  tagStates?: Record<string, "include" | "exclude">;
  onPressTag?: (tag: string) => void;
  onPressLike: () => void;
  onPressComments: () => void;
  onPressBuy: () => void;
  onPressSupport: () => void;
};

/**
 * リール1枚分。1画面に1曲を表示する。
 *
 * 画像の上に文字を重ねると、ジャケットの明るさによって可読性が変わってしまうため、
 * ジャケットは大きな正方形として置き、情報はその下の白地に並べる。
 * これでアプリ全体を明るい配色で統一できる。
 */
export function ReelCard({
  song,
  height,
  isActive,
  weeklyRank,
  isLiked,
  isPaused,
  onTogglePlay,
  tagStates,
  onPressTag,
  onPressLike,
  onPressComments,
  onPressBuy,
  onPressSupport,
}: ReelCardProps) {
  // ジャケットは余った領域に合わせて伸縮させる。
  // 固定比率にすると、絞り込みバーが高くなったときに下のボタンが押し出されてしまう。
  const [jacketSize, setJacketSize] = useState(0);
  const lastTapRef = useRef(0);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // シングルタップ=再生/停止、ダブルタップ=いいね
  const handleJacketTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 260) {
      lastTapRef.current = 0;
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      onPressLike();
      return;
    }
    lastTapRef.current = now;
    singleTapTimerRef.current = setTimeout(() => {
      singleTapTimerRef.current = null;
      onTogglePlay?.();
    }, 260);
  };

  const changeRate = calculatePriceChangeRate(song);
  const rising = changeRate > 0;
  const falling = changeRate < 0;
  const changeColor = rising ? Colors.up : falling ? Colors.down : Colors.textMuted;

  return (
    <View style={[styles.card, { height }]}>
      <View style={styles.topRow}>
        <View style={styles.genreChip}>
          <Text style={styles.genreChipText}>{song.genre}</Text>
        </View>
        {weeklyRank != null && weeklyRank <= 3 && (
          <View style={styles.rankChip}>
            <Text style={styles.rankChipText}>週間応援 {weeklyRank}位</Text>
          </View>
        )}
        <View style={styles.spacer} />
        {song.audioUrl ? (
          isActive && !isPaused ? (
            <Text style={styles.playingText}>♪ 再生中</Text>
          ) : null
        ) : (
          <Text style={styles.playingText}>音源準備中</Text>
        )}
      </View>

      <Pressable
        onPress={handleJacketTap}
        style={styles.jacketWrap}
        onLayout={(event) => {
          const { width: w, height: h } = event.nativeEvent.layout;
          const next = Math.floor(Math.max(0, Math.min(w, h)));
          if (next !== jacketSize) {
            setJacketSize(next);
          }
        }}
      >
        {jacketSize === 0 ? null : song.jacketUrl ? (
          <Image
            source={{ uri: song.jacketUrl }}
            style={{ width: jacketSize, height: jacketSize, borderRadius: 20 }}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <View
            style={[
              styles.jacketFallback,
              { width: jacketSize, height: jacketSize },
            ]}
          >
            <Ionicons name="musical-notes" size={56} color={Colors.textFaint} />
          </View>
        )}

        {isActive && isPaused && (
          <View style={styles.pausedOverlay} pointerEvents="none">
            <View style={styles.pausedCircle}>
              <Ionicons name="play" size={30} color={Colors.onAccent} />
            </View>
          </View>
        )}
      </Pressable>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {song.artistName}
        </Text>

        {song.tags && song.tags.length > 0 && (
          <View style={styles.tagRow}>
            {song.tags.slice(0, 3).map((tag) => {
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
                  <Text
                    style={[
                      styles.tagChipText,
                      mode === "include" && styles.tagChipTextInclude,
                      mode === "exclude" && styles.tagChipTextExclude,
                    ]}
                  >
                    {mode === "exclude" ? `✕ #${tag}` : `#${tag}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.priceRow}>
          <Text style={styles.price}>
            {formatPoint(song.currentPrice)}
            <Text style={styles.priceUnit}> pt</Text>
          </Text>
          <Text style={[styles.change, { color: changeColor }]}>
            {rising ? "▲" : falling ? "▼" : "－"}{" "}
            {formatRate(changeRate).replace(/^[+-]/, "")}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <Text style={styles.stat}>
            応援 <Text style={styles.statValue}>{formatPoint(song.supportPoint)}</Text> pt
          </Text>
          <View style={styles.statDivider} />
          <Text style={styles.stat}>
            保有者 <Text style={styles.statValue}>{formatPoint(song.holderCount)}</Text> 人
          </Text>
        </View>

        {/* 画面が低いときは進捗を省いて、ジャケットとボタンを優先する */}
        {height >= 520 && (
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>制作進捗</Text>
            <View style={styles.progressBar}>
              <ProgressBar progress={song.progress} />
            </View>
          </View>
        )}
      </View>

      <View style={styles.iconRow}>
        <Pressable style={styles.iconButton} onPress={onPressLike}>
          <Ionicons
            name={isLiked ? "heart" : "heart-outline"}
            size={22}
            color={isLiked ? Colors.down : Colors.text}
          />
          <Text style={styles.iconLabel}>{formatPoint(song.likeCount)}</Text>
        </Pressable>
        <Pressable style={styles.iconButton} onPress={onPressComments}>
          <Ionicons name="chatbubble-outline" size={20} color={Colors.text} />
          <Text style={styles.iconLabel}>{formatPoint(song.commentCount)}</Text>
        </Pressable>
        <Pressable
          style={styles.iconButton}
          onPress={() => router.push(`/songs/${song.id}`)}
        >
          <Ionicons name="information-circle-outline" size={22} color={Colors.text} />
          <Text style={styles.iconLabel}>詳細</Text>
        </Pressable>
      </View>

      <View style={styles.ctaRow}>
        <Pressable style={styles.buyButton} onPress={onPressBuy}>
          <Text style={styles.buyButtonText}>買う</Text>
        </Pressable>
        <Pressable style={styles.supportButton} onPress={onPressSupport}>
          <Text style={styles.supportButtonText}>応援する</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: Colors.card,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    overflow: "hidden",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  spacer: {
    flex: 1,
  },
  genreChip: {
    backgroundColor: Colors.input,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  genreChipText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  rankChip: {
    backgroundColor: "#FAEEDA",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rankChipText: {
    color: Colors.onGold,
    fontSize: 11,
    fontWeight: "800",
  },
  playingText: {
    color: Colors.textFaint,
    fontSize: 11,
    fontWeight: "700",
  },
  jacketWrap: {
    // 余った高さを全部ここが吸収する。中身が増えても下のボタンが押し出されない。
    flex: 1,
    minHeight: 0,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  jacketFallback: {
    borderRadius: 20,
    backgroundColor: Colors.input,
    alignItems: "center",
    justifyContent: "center",
  },
  pausedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  pausedCircle: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: "rgba(17, 17, 19, 0.72)",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 4,
  },
  info: {
    gap: 4,
  },
  title: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  artist: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  tagChip: {
    backgroundColor: Colors.input,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagChipInclude: {
    backgroundColor: Colors.accent,
  },
  tagChipExclude: {
    backgroundColor: "#FCEBEB",
  },
  tagChipText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  // 選択中は黒地に白文字
  tagChipTextInclude: {
    color: Colors.onAccent,
  },
  // 除外は薄い赤地なので、文字も赤系にしないと読めない
  tagChipTextExclude: {
    color: Colors.down,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginTop: 10,
  },
  price: {
    color: Colors.text,
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
  },
  priceUnit: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  change: {
    fontSize: 15,
    fontWeight: "800",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  stat: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  statValue: {
    color: Colors.text,
    fontWeight: "800",
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: Colors.cardBorder,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  progressLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  progressBar: {
    flex: 1,
  },
  iconRow: {
    flexDirection: "row",
    gap: 22,
    alignItems: "center",
  },
  iconButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  ctaRow: {
    flexDirection: "row",
    gap: 10,
  },
  buyButton: {
    flex: 2,
    backgroundColor: Colors.accent,
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: "center",
  },
  buyButtonText: {
    color: Colors.onAccent,
    fontSize: 15,
    fontWeight: "800",
  },
  supportButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: 15,
    alignItems: "center",
  },
  supportButtonText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
});
