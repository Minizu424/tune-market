import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SongJacket } from "@/components/songs/SongJacket";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Screen } from "@/components/ui/Screen";
import { Colors } from "@/constants/colors";
import { useAuthUser } from "@/hooks/use-auth-user";
import { formatPoint } from "@/lib/format";
import {
  getArtistDashboard,
  type ArtistDashboard,
} from "@/services/getArtistDashboard";

export default function ArtistDashboardScreen() {
  const { firebaseUser } = useAuthUser();
  const [dashboard, setDashboard] = useState<ArtistDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!firebaseUser) {
        return;
      }
      let active = true;

      getArtistDashboard(firebaseUser.uid)
        .then((data) => {
          if (active) {
            setDashboard(data);
          }
        })
        .catch(console.error)
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });

      return () => {
        active = false;
      };
    }, [firebaseUser]),
  );

  if (loading) {
    return (
      <Screen title="制作者ダッシュボード" showBottomNav>
        <ActivityIndicator color={Colors.accent} />
      </Screen>
    );
  }

  if (!dashboard) {
    return (
      <Screen title="制作者ダッシュボード" showBottomNav>
        <Text style={styles.emptyText}>
          アーティスト登録がまだ完了していません。
        </Text>
        <AppButton
          title="アーティスト登録する"
          onPress={() => router.push("/artist/register")}
          style={styles.registerButton}
        />
      </Screen>
    );
  }

  const { artist, songs, weeklyRank, totals } = dashboard;

  return (
    <Screen title="制作者ダッシュボード" subtitle={artist.artistName} showBottomNav>
      <AppCard style={styles.heroCard}>
        <Text style={styles.heroLabel}>今週の応援ポイント</Text>
        <Text style={styles.heroValue}>
          {formatPoint(artist.weeklySupportPoint)} pt
        </Text>
        <Text style={styles.heroSub}>
          週間ランキング：{weeklyRank ? `${weeklyRank}位` : "圏外"} ／ 総応援pt：
          {formatPoint(artist.totalSupportPoint)}pt
        </Text>
      </AppCard>

      <View style={styles.statsGrid}>
        <StatTile label="総再生数" value={formatPoint(totals.playCount)} />
        <StatTile label="総いいね" value={formatPoint(totals.likeCount)} />
        <StatTile label="総コメント" value={formatPoint(totals.commentCount)} />
        <StatTile label="保有者数" value={formatPoint(totals.holderCount)} />
        <StatTile label="投稿楽曲数" value={String(totals.songCount)} />
        <StatTile label="フォロワー" value={formatPoint(artist.followerCount)} />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>投稿楽曲一覧</Text>
      </View>

      {songs.length === 0 ? (
        <Text style={styles.emptyText}>まだ楽曲を投稿していません。</Text>
      ) : (
        songs.map((song) => (
          <AppCard key={song.id} style={styles.songCard}>
            <View style={styles.songRow}>
              <SongJacket jacketUrl={song.jacketUrl} title={song.title} size={46} />
              <View style={styles.songInfo}>
                <Text style={styles.songTitle} numberOfLines={1}>
                  {song.title}
                  {song.status !== "public" && (
                    <Text style={styles.draftBadge}>（{song.status === "draft" ? "下書き" : "非公開"}）</Text>
                  )}
                </Text>
                <Text style={styles.songMeta}>
                  {formatPoint(song.currentPrice)}pt ・ 応援{" "}
                  {formatPoint(song.supportPoint)}pt ・ 保有者{" "}
                  {formatPoint(song.holderCount)}人
                </Text>
              </View>
            </View>
            <View style={styles.progressRow}>
              <ProgressBar progress={song.progress} />
            </View>
            <View style={styles.songActions}>
              <Pressable
                style={styles.songAction}
                onPress={() => router.push(`/artist/songs/${song.id}/edit`)}
              >
                <Text style={styles.songActionText}>編集</Text>
              </Pressable>
              <Pressable
                style={styles.songAction}
                onPress={() => router.push(`/artist/songs/${song.id}/poll`)}
              >
                <Text style={styles.songActionText}>株主投票</Text>
              </Pressable>
              <Pressable
                style={[styles.songAction, styles.songActionPrimary]}
                onPress={() => router.push(`/artist/songs/${song.id}/progress`)}
              >
                <Text style={styles.songActionTextPrimary}>進捗更新</Text>
              </Pressable>
            </View>
          </AppCard>
        ))
      )}

      <AppButton
        title="＋ 新しい楽曲を投稿する"
        onPress={() => router.push("/artist/songs/new")}
        style={styles.newSongButton}
      />
    </Screen>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    marginBottom: 14,
    backgroundColor: Colors.subtle,
    borderColor: Colors.cardBorder,
  },
  heroLabel: {
    color: Colors.accentSoft,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  heroValue: {
    color: Colors.text,
    fontSize: 34,
    fontWeight: "800",
  },
  heroSub: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 6,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  statTile: {
    flexBasis: "31%",
    flexGrow: 1,
    backgroundColor: Colors.card,
    borderColor: Colors.cardBorder,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  statValue: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 3,
  },
  statLabel: {
    color: Colors.textFaint,
    fontSize: 10,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    color: Colors.accentSoft,
    fontSize: 15,
    fontWeight: "800",
  },
  songCard: {
    marginBottom: 10,
  },
  songRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 3,
  },
  draftBadge: {
    color: Colors.textFaint,
    fontSize: 12,
  },
  songMeta: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  progressRow: {
    marginTop: 10,
  },
  songActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  songAction: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.input,
    paddingVertical: 9,
    alignItems: "center",
  },
  songActionPrimary: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  songActionText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  songActionTextPrimary: {
    color: Colors.onAccent,
    fontSize: 12,
    fontWeight: "700",
  },
  newSongButton: {
    marginTop: 8,
  },
  emptyText: {
    color: Colors.textFaint,
    fontSize: 13,
    marginBottom: 8,
  },
  registerButton: {
    marginTop: 8,
  },
});
