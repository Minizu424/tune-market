import { router, useFocusEffect } from "expo-router";
import { signOut } from "firebase/auth";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { Screen } from "@/components/ui/Screen";
import { Colors } from "@/constants/colors";
import { useAuthUser } from "@/hooks/use-auth-user";
import { auth } from "@/lib/firebase";
import { formatPoint } from "@/lib/format";
import { getArtistByUserId } from "@/repositories/artistsRepository";
import { getUserSupports } from "@/repositories/supportsRepository";
import { getSongById } from "@/repositories/songsRepository";
import { updateSongPrices } from "@/services/updateSongPrices";
import type { Artist, Support } from "@/types";

type SupportWithTitle = Support & { songTitle: string };

export default function MyPageScreen() {
  const { firebaseUser, profile, refreshProfile } = useAuthUser();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [supports, setSupports] = useState<SupportWithTitle[]>([]);
  const [updatingPrices, setUpdatingPrices] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!firebaseUser) {
        return;
      }
      let active = true;

      refreshProfile().catch(console.error);

      getArtistByUserId(firebaseUser.uid)
        .then((data) => {
          if (active) {
            setArtist(data);
          }
        })
        .catch(console.error);

      getUserSupports(firebaseUser.uid, 5)
        .then(async (data) => {
          const withTitles = await Promise.all(
            data.map(async (support) => {
              const song = await getSongById(support.songId);
              return { ...support, songTitle: song?.title ?? "(削除された楽曲)" };
            }),
          );
          if (active) {
            setSupports(withTitles);
          }
        })
        .catch(console.error);

      return () => {
        active = false;
      };
    }, [firebaseUser, refreshProfile]),
  );

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/");
  };

  const handleUpdatePrices = async () => {
    setUpdatingPrices(true);
    try {
      const count = await updateSongPrices();
      Alert.alert("株価更新", `${count}曲の株価を更新しました。`);
    } catch (error) {
      console.error(error);
      Alert.alert("エラー", "株価の更新に失敗しました。");
    } finally {
      setUpdatingPrices(false);
    }
  };

  return (
    <Screen
      title="マイページ"
      subtitle="ポイントやアーティスト登録を確認しよう。"
      showBottomNav
    >
      <AppCard style={styles.card}>
        <Text style={styles.name}>
          {profile?.displayName || profile?.email || "ゲスト"}
        </Text>
        <Text style={styles.role}>
          {profile?.role === "artist" ? "アーティスト" : "リスナー"}
        </Text>
        <View style={styles.pointRow}>
          <Text style={styles.pointLabel}>保有ポイント</Text>
          <Text style={styles.pointValue}>
            {profile ? `${formatPoint(profile.pointBalance)} pt` : "---"}
          </Text>
        </View>
        <Text style={styles.note}>ポイント・株は現金化することはできません</Text>
      </AppCard>

      <AppCard style={styles.card}>
        <Text style={styles.sectionTitle}>アーティスト</Text>
        {artist ? (
          <>
            <Text style={styles.artistName}>{artist.artistName}</Text>
            <AppButton
              title="制作者ダッシュボードへ"
              onPress={() => router.push("/artist/dashboard")}
              style={styles.button}
            />
          </>
        ) : (
          <>
            <Text style={styles.sectionText}>
              楽曲を投稿して応援を集めたい方は、アーティスト登録をしましょう。
            </Text>
            <AppButton
              title="アーティスト登録する"
              onPress={() => router.push("/artist/register")}
              style={styles.button}
            />
          </>
        )}
      </AppCard>

      <AppCard style={styles.card}>
        <Text style={styles.sectionTitle}>最近の応援履歴</Text>
        {supports.length === 0 ? (
          <Text style={styles.sectionText}>まだ応援履歴はありません。</Text>
        ) : (
          supports.map((support) => (
            <View key={support.id} style={styles.supportRow}>
              <Text style={styles.supportTitle} numberOfLines={1}>
                {support.songTitle}
              </Text>
              <Text style={styles.supportPoint}>
                +{formatPoint(support.point)}pt
              </Text>
            </View>
          ))
        )}
      </AppCard>

      <AppCard style={styles.card}>
        <Text style={styles.sectionTitle}>開発ツール</Text>
        <Text style={styles.sectionText}>
          株価は本来1日1回のバッチ更新ですが、MVPでは手動で実行できます。
        </Text>
        <AppButton
          title={updatingPrices ? "更新中..." : "株価を更新する"}
          variant="secondary"
          onPress={handleUpdatePrices}
          disabled={updatingPrices}
          style={styles.button}
        />
      </AppCard>

      <AppButton title="ログアウト" variant="ghost" onPress={handleLogout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
  },
  name: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 2,
  },
  role: {
    color: Colors.accentSoft,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 14,
  },
  pointRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  pointLabel: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  pointValue: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  note: {
    color: Colors.textFaint,
    fontSize: 11,
    marginTop: 8,
  },
  sectionTitle: {
    color: Colors.accentSoft,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },
  sectionText: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 4,
  },
  artistName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  button: {
    marginTop: 10,
  },
  supportRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  supportTitle: {
    color: Colors.text,
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  supportPoint: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: "700",
  },
});
