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
import { formatPoint, formatQuantity } from "@/lib/format";
import { sellSongStock } from "@/services/sellSongStock";
import type { Song } from "@/types";

type SellStockModalProps = {
  visible: boolean;
  song: Song;
  userId: string;
  holdingQuantity: number;
  onClose: () => void;
  onCompleted: () => void;
};

export function SellStockModal({
  visible,
  song,
  userId,
  holdingQuantity,
  onClose,
  onCompleted,
}: SellStockModalProps) {
  const [quantityText, setQuantityText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [priceMove, setPriceMove] = useState<string | null>(null);

  const quantity = Number(quantityText);
  const isValid = Number.isFinite(quantity) && quantity > 0;
  const proceeds = isValid ? quantity * song.currentPrice : 0;

  const setRatio = (ratio: number) => {
    const next = Number((holdingQuantity * ratio).toFixed(4));
    setQuantityText(String(next));
  };

  const handleSell = async () => {
    if (!isValid) {
      setMessage("売却する株数を正しく入力してください。");
      return;
    }
    if (quantity > holdingQuantity + 0.0001) {
      setMessage("保有株数を超えて売却することはできません。");
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setPriceMove(null);
    try {
      const result = await sellSongStock({
        userId,
        songId: song.id,
        quantity,
      });
      const changeRate =
        ((result.newPrice - result.beforePrice) / result.beforePrice) * 100;
      setMessage(`${formatQuantity(quantity)}を売却し、${formatPoint(result.proceeds)}ptを受け取りました。`);
      setPriceMove(
        `株価 ${formatPoint(result.beforePrice)}pt → ${formatPoint(result.newPrice)}pt（${changeRate.toFixed(1)}%）`,
      );
      onCompleted();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "売却に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.title}>楽曲株を売る</Text>
        <Text style={styles.songName}>
          {song.title} ・ 現在価格 {formatPoint(song.currentPrice)}pt
        </Text>
        <Text style={styles.balance}>
          保有株数：{formatQuantity(holdingQuantity)}
        </Text>

        <View style={styles.presets}>
          {[
            { label: "25%", ratio: 0.25 },
            { label: "50%", ratio: 0.5 },
            { label: "全部", ratio: 1 },
          ].map((preset) => (
            <Pressable
              key={preset.label}
              style={styles.preset}
              onPress={() => setRatio(preset.ratio)}
            >
              <Text style={styles.presetText}>{preset.label}</Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          style={styles.input}
          value={quantityText}
          onChangeText={setQuantityText}
          keyboardType="numeric"
          placeholder="売却する株数"
          placeholderTextColor={Colors.textFaint}
        />

        {isValid && (
          <Text style={styles.preview}>
            約 {formatPoint(proceeds)}pt を受け取ります
          </Text>
        )}

        {message && <Text style={styles.message}>{message}</Text>}
        {priceMove && <Text style={styles.priceMove}>{priceMove}</Text>}

        <AppButton
          title={submitting ? "処理中..." : "売却する"}
          onPress={handleSell}
          disabled={submitting || holdingQuantity <= 0}
          style={styles.button}
        />
        <AppButton title="閉じる" variant="ghost" onPress={onClose} />

        <Text style={styles.disclaimer}>
          ※売却で戻るのはアプリ内ポイントのみで、現金化はできません。
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(27, 26, 24, 0.35)",
  },
  sheet: {
    backgroundColor: Colors.card,
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
  presetText: {
    color: Colors.textMuted,
    fontWeight: "700",
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
  preview: {
    color: Colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  priceMove: {
    color: Colors.down,
    fontSize: 15,
    fontWeight: "800",
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
