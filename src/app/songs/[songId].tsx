import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CommentsSheet } from "@/components/comments/CommentsSheet";
import { PollCard } from "@/components/poll/PollCard";
import { SongJacket } from "@/components/songs/SongJacket";
import { SupportModal } from "@/components/support/SupportModal";
import { BuyStockModal } from "@/components/trade/BuyStockModal";
import { SellStockModal } from "@/components/trade/SellStockModal";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { PriceChart } from "@/components/ui/PriceChart";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Screen } from "@/components/ui/Screen";
import { Colors } from "@/constants/colors";
import { useAuthUser } from "@/hooks/use-auth-user";
import { formatPoint, formatQuantity, formatRate } from "@/lib/format";
import { getHolding } from "@/repositories/holdingsRepository";
import { getLike } from "@/repositories/likesRepository";
import { getPriceHistories } from "@/repositories/priceHistoriesRepository";
import {
  calculatePriceChangeRate,
  getSongById,
} from "@/repositories/songsRepository";
import { usePlayback } from "@/contexts/PlaybackContext";
import { toggleSongLike } from "@/services/toggleSongLike";
import type { Holding, Song } from "@/types";

type ModalKind = "buy" | "sell" | "support" | "comments" | null;

export default function SongDetailScreen() {
  const { songId } = useLocalSearchParams<{ songId: string }>();
  const { firebaseUser, profile, refreshProfile } = useAuthUser();

  const [song, setSong] = useState<Song | null>(null);
  const [holding, setHolding] = useState<Holding | null>(null);
  const [prices, setPrices] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalKind>(null);
  const [liked, setLiked] = useState(false);

  const playback = usePlayback();

  const loadData = useCallback(async () => {
    if (!songId) {
      return;
    }
    try {
      const [songData, histories] = await Promise.all([
        getSongById(songId),
        getPriceHistories(songId),
      ]);
      setSong(songData);
      setPrices(histories.map((history) => history.price));

      if (firebaseUser) {
        const [holdingData, likeData] = await Promise.all([
          getHolding(firebaseUser.uid, songId),
          getLike(firebaseUser.uid, songId),
        ]);
        setHolding(holdingData);
        setLiked(Boolean(likeData));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [songId, firebaseUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCompleted = useCallback(() => {
    loadData();
    refreshProfile().catch(console.error);
  }, [loadData, refreshProfile]);

  if (loading || !song) {
    return (
      <Screen title="楽曲詳細" showBottomNav>
        {loading ? (
          <ActivityIndicator color={Colors.accent} />
        ) : (
          <Text style={styles.emptyText}>楽曲が見つかりませんでした。</Text>
        )}
      </Screen>
    );
  }

  const changeRate = calculatePriceChangeRate(song);
  const changeColor =
    changeRate > 0 ? Colors.up : changeRate < 0 ? Colors.down : Colors.textMuted;
  const holdingQuantity = holding?.quantity ?? 0;
  const canTrade = Boolean(firebaseUser && profile);

  const handleToggleLike = async () => {
    if (!profile) {
      return;
    }
    const wasLiked = liked;
    setLiked(!wasLiked);
    setSong((prev) =>
      prev ? { ...prev, likeCount: prev.likeCount + (wasLiked ? -1 : 1) } : prev,
    );
    try {
      await toggleSongLike(profile.id, song.id);
    } catch (error) {
      console.error(error);
      setLiked(wasLiked);
      setSong((prev) =>
        prev ? { ...prev, likeCount: prev.likeCount + (wasLiked ? 1 : -1) } : prev,
      );
    }
  };

  return (
    <Screen showBottomNav>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← 戻る</Text>
      </Pressable>

      <View style={styles.header}>
        <SongJacket jacketUrl={song.jacketUrl} title={song.title} size={84} />
        <View style={styles.headerInfo}>
          <Text style={styles.genre}>
            {song.genre}
            {song.tags && song.tags.length > 0
              ? `  ${song.tags.map((tag) => `#${tag}`).join(" ")}`
              : ""}
          </Text>
          <Text style={styles.title}>{song.title}</Text>
          <Text style={styles.artist}>{song.artistName}</Text>
        </View>
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.price}>{formatPoint(song.currentPrice)} pt</Text>
        <Text style={[styles.change, { color: changeColor }]}>
          {formatRate(changeRate)}（前回比）
        </Text>
        <Pressable
          style={[styles.likeButton, liked && styles.likeButtonActive]}
          onPress={handleToggleLike}
          disabled={!canTrade}
        >
          <Text style={styles.likeButtonText}>
            {liked ? "❤️" : "🤍"} {formatPoint(song.likeCount)}
          </Text>
        </Pressable>
      </View>

      {song.audioUrl ? (
        <AppButton
          title={
            playback.currentSong?.id === song.id && playback.isPlaying
              ? "一時停止"
              : "▶ 試聴する"
          }
          variant="secondary"
          onPress={() => {
            if (playback.currentSong?.id === song.id) {
              playback.toggle();
            } else {
              playback.playSingle(song);
            }
          }}
          style={styles.playButton}
        />
      ) : (
        <Text style={styles.noAudio}>音源は準備中です</Text>
      )}

      <AppCard style={styles.card}>
        <Text style={styles.cardTitle}>価格チャート</Text>
        <PriceChart prices={prices} />
      </AppCard>

      <PollCard
        songId={song.id}
        userId={firebaseUser?.uid ?? null}
        holdingQuantity={holdingQuantity}
      />

      <AppCard style={styles.card}>
        <Text style={styles.cardTitle}>制作進捗</Text>
        <ProgressBar progress={song.progress} />
      </AppCard>

      <AppCard style={styles.card}>
        <View style={styles.statsRow}>
          <Stat label="保有者数" value={formatPoint(song.holderCount)} />
          <Stat label="応援pt" value={formatPoint(song.supportPoint)} />
          <Stat label="再生数" value={formatPoint(song.playCount)} />
          <Stat label="いいね" value={formatPoint(song.likeCount)} />
        </View>
      </AppCard>

      {holdingQuantity > 0 && (
        <AppCard style={styles.card}>
          <Text style={styles.cardTitle}>あなたの保有</Text>
          <Text style={styles.holdingText}>
            {formatQuantity(holdingQuantity)} ／ 平均取得価格{" "}
            {formatPoint(holding?.averagePrice ?? 0)}pt
          </Text>
        </AppCard>
      )}

      {song.description ? (
        <AppCard style={styles.card}>
          <Text style={styles.cardTitle}>楽曲について</Text>
          <Text style={styles.description}>{song.description}</Text>
        </AppCard>
      ) : null}

      <View style={styles.actions}>
        <AppButton
          title="買う"
          onPress={() => setModal("buy")}
          disabled={!canTrade}
          style={styles.actionButton}
        />
        <AppButton
          title="売る"
          variant="secondary"
          onPress={() => setModal("sell")}
          disabled={!canTrade || holdingQuantity <= 0}
          style={styles.actionButton}
        />
        <AppButton
          title="応援する"
          onPress={() => setModal("support")}
          disabled={!canTrade}
          style={StyleSheet.flatten([styles.actionButton, styles.supportButton])}
        />
      </View>

      <AppCard style={styles.card}>
        <Text style={styles.cardTitle}>コメント（{formatPoint(song.commentCount)}）</Text>
        <AppButton
          title="コメントを見る・書く"
          variant="secondary"
          onPress={() => setModal("comments")}
        />
      </AppCard>

      <Text style={styles.disclaimer}>
        ※楽曲株は実際の金融商品ではありません。ポイントは現金化できず、利益は保証されません。
      </Text>

      <CommentsSheet
        visible={modal === "comments"}
        song={song}
        profile={profile}
        onClose={() => setModal(null)}
        onCommentAdded={() =>
          setSong((prev) =>
            prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev,
          )
        }
      />

      {canTrade && profile && (
        <>
          <BuyStockModal
            visible={modal === "buy"}
            song={song}
            userId={profile.id}
            pointBalance={profile.pointBalance}
            onClose={() => setModal(null)}
            onCompleted={handleCompleted}
          />
          <SellStockModal
            visible={modal === "sell"}
            song={song}
            userId={profile.id}
            holdingQuantity={holdingQuantity}
            onClose={() => setModal(null)}
            onCompleted={handleCompleted}
          />
          <SupportModal
            visible={modal === "support"}
            song={song}
            userId={profile.id}
            pointBalance={profile.pointBalance}
            onClose={() => setModal(null)}
            onCompleted={handleCompleted}
          />
        </>
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  back: {
    marginBottom: 12,
  },
  backText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  header: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  headerInfo: {
    flex: 1,
  },
  genre: {
    color: Colors.accentSoft,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  title: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
  },
  artist: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 12,
    marginBottom: 16,
  },
  price: {
    color: Colors.text,
    fontSize: 32,
    fontWeight: "800",
  },
  change: {
    fontSize: 14,
    fontWeight: "700",
  },
  playButton: {
    marginBottom: 16,
  },
  noAudio: {
    color: Colors.textFaint,
    fontSize: 12,
    marginBottom: 16,
  },
  card: {
    marginBottom: 12,
  },
  cardTitle: {
    color: Colors.accentSoft,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stat: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  holdingText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  description: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
  },
  supportButton: {
    backgroundColor: Colors.gold,
  },
  emptyText: {
    color: Colors.textFaint,
  },
  disclaimer: {
    color: Colors.textFaint,
    fontSize: 11,
    marginTop: 16,
    lineHeight: 16,
  },
  likeButton: {
    marginLeft: "auto",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.card,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  likeButtonActive: {
    borderColor: Colors.down,
    backgroundColor: "rgba(196, 52, 43, 0.08)",
  },
  likeButtonText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
});
