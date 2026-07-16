import { router, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SongJacket } from "@/components/songs/SongJacket";
import { Colors } from "@/constants/colors";
import { usePlayback } from "@/contexts/PlaybackContext";

/**
 * YouTube風のミニプレイヤー。
 * ホーム（リール）以外の画面で再生中の曲を表示し、
 * 再生/一時停止・停止・タップで楽曲詳細への移動ができる。
 */
export function MiniPlayer() {
  const pathname = usePathname();
  const { currentSong, isPlaying, toggle, stop } = usePlayback();

  // リール画面とログイン画面では表示しない
  if (!currentSong || pathname === "/home" || pathname === "/") {
    return null;
  }

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.bar}>
        <Pressable
          style={styles.body}
          onPress={() => router.push(`/songs/${currentSong.id}`)}
        >
          <SongJacket
            jacketUrl={currentSong.jacketUrl}
            title={currentSong.title}
            size={38}
          />
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
              {currentSong.title}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {currentSong.artistName}
            </Text>
          </View>
        </Pressable>

        <Pressable style={styles.controlButton} onPress={toggle}>
          <Text style={styles.controlText}>{isPlaying ? "⏸" : "▶"}</Text>
        </Pressable>
        <Pressable style={styles.controlButton} onPress={stop}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 88,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#171F35",
    borderColor: Colors.cardBorder,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  body: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  info: {
    flex: 1,
  },
  title: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  artist: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: Colors.card,
    borderColor: Colors.cardBorder,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  controlText: {
    color: Colors.text,
    fontSize: 14,
  },
  closeText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
});
