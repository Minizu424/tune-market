import { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppButton } from "@/components/ui/AppButton";
import { Colors } from "@/constants/colors";
import { formatPoint } from "@/lib/format";
import { supportSong } from "@/services/supportSong";
import type { Song } from "@/types";

const PRESET_POINTS = [10, 50, 100];

type SupportModalProps = {
  visible: boolean;
  song: Song;
  userId: string;
  pointBalance: number;
  onClose: () => void;
  onCompleted: () => void;
};

export function SupportModal({
  visible,
  song,
  userId,
  pointBalance,
  onClose,
  onCompleted,
}: SupportModalProps) {
  const [pointText, setPointText] = useState("10");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const point = Number(pointText);
  const isValid = Number.isFinite(point) && point > 0;

  const handleSupport = async () => {
    if (!isValid) {
      setMessage("応援ポイントを正しく入力してください。");
      return;
    }
    if (point > pointBalance) {
      setMessage("ポイント残高が不足しています。");
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      await supportSong({
        userId,
        songId: song.id,
        artistId: song.artistId,
        point,
      });
      setMessage(
        `${song.title} と ${song.artistName} に ${formatPoint(point)}pt を送りました！`,
      );
      onCompleted();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "応援に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.title}>応援する</Text>
        <Text style={styles.songName}>
          {song.title} / {song.artistName}
        </Text>
        <Text style={styles.balance}>保有ポイント：{formatPoint(pointBalance)}pt</Text>

        <View style={styles.presets}>
          {PRESET_POINTS.map((preset) => (
            <Pressable
              key={preset}
              style={[
                styles.preset,
                pointText === String(preset) && styles.presetActive,
              ]}
              onPress={() => setPointText(String(preset))}
            >
              <Text
                style={[
                  styles.presetText,
                  pointText === String(preset) && styles.presetTextActive,
                ]}
              >
                {preset}pt
              </Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          style={styles.input}
          value={pointText}
          onChangeText={setPointText}
          keyboardType="numeric"
          placeholder="応援ポイント"
          placeholderTextColor={Colors.textFaint}
        />

        {message && <Text style={styles.message}>{message}</Text>}

        <AppButton
          title={submitting ? "処理中..." : "応援ポイントを送る"}
          onPress={handleSupport}
          disabled={submitting}
          style={styles.button}
        />
        <AppButton title="閉じる" variant="ghost" onPress={onClose} />

        <Text style={styles.disclaimer}>
          ※応援ポイントは週間ランキングに反映されます。現金化はできません。
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    backgroundColor: "#0F172A",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderColor: Colors.cardBorder,
    borderWidth: 1,
  },
  title: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
  },
  songName: {
    color: Colors.textMuted,
    fontSize: 13,
    marginBottom: 4,
  },
  balance: {
    color: Colors.accentSoft,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 16,
  },
  presets: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  preset: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.card,
    paddingVertical: 10,
    alignItems: "center",
  },
  presetActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  presetText: {
    color: Colors.textMuted,
    fontWeight: "700",
  },
  presetTextActive: {
    color: Colors.text,
  },
  input: {
    backgroundColor: Colors.input,
    color: Colors.text,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  message: {
    color: Colors.accentSoft,
    fontSize: 13,
    marginBottom: 8,
  },
  button: {
    marginTop: 8,
    marginBottom: 4,
  },
  disclaimer: {
    color: Colors.textFaint,
    fontSize: 11,
    marginTop: 12,
    textAlign: "center",
  },
});
