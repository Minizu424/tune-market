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
import { buySongStock } from "@/services/buySongStock";
import type { Song } from "@/types";

const PRESET_AMOUNTS = [10, 50, 100];

type BuyStockModalProps = {
  visible: boolean;
  song: Song;
  userId: string;
  pointBalance: number;
  onClose: () => void;
  onCompleted: () => void;
};

export function BuyStockModal({
  visible,
  song,
  userId,
  pointBalance,
  onClose,
  onCompleted,
}: BuyStockModalProps) {
  const [amountText, setAmountText] = useState("50");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [priceMove, setPriceMove] = useState<string | null>(null);

  const amount = Number(amountText);
  const isValid = Number.isFinite(amount) && amount > 0;
  const quantity = isValid ? amount / song.currentPrice : 0;

  const handleBuy = async () => {
    if (!isValid) {
      setMessage("購入ポイントを正しく入力してください。");
      return;
    }
    if (amount > pointBalance) {
      setMessage("ポイント残高が不足しています。");
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setPriceMove(null);
    try {
      const result = await buySongStock({
        userId,
        songId: song.id,
        pointAmount: amount,
      });
      const changeRate =
        ((result.newPrice - result.beforePrice) / result.beforePrice) * 100;
      setMessage(
        `${formatPoint(amount)}pt分（${result.quantity}株）を購入しました。`,
      );
      setPriceMove(
        `株価 ${formatPoint(result.beforePrice)}pt → ${formatPoint(result.newPrice)}pt（+${changeRate.toFixed(1)}%）`,
      );
      onCompleted();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "購入に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.title}>楽曲株を買う</Text>
        <Text style={styles.songName}>
          {song.title} ・ 現在価格 {formatPoint(song.currentPrice)}pt
        </Text>
        <Text style={styles.balance}>保有ポイント：{formatPoint(pointBalance)}pt</Text>

        <View style={styles.presets}>
          {PRESET_AMOUNTS.map((preset) => (
            <Pressable
              key={preset}
              style={[
                styles.preset,
                amountText === String(preset) && styles.presetActive,
              ]}
              onPress={() => setAmountText(String(preset))}
            >
              <Text
                style={[
                  styles.presetText,
                  amountText === String(preset) && styles.presetTextActive,
                ]}
              >
                {preset}pt
              </Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          style={styles.input}
          value={amountText}
          onChangeText={setAmountText}
          keyboardType="numeric"
          placeholder="購入ポイント"
          placeholderTextColor={Colors.textFaint}
        />

        {isValid && (
          <Text style={styles.preview}>
            約 {Number(quantity.toFixed(4))} 株を購入します（端数購入可）
          </Text>
        )}

        {message && <Text style={styles.message}>{message}</Text>}
        {priceMove && <Text style={styles.priceMove}>{priceMove}</Text>}

        <AppButton
          title={submitting ? "処理中..." : "購入する"}
          onPress={handleBuy}
          disabled={submitting}
          style={styles.button}
        />
        <AppButton title="閉じる" variant="ghost" onPress={onClose} />

        <Text style={styles.disclaimer}>
          ※楽曲株は実際の金融商品ではなく、ポイントは現金化できません。
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
  presetActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  presetText: {
    color: Colors.textMuted,
    fontWeight: "700",
  },
  presetTextActive: {
    color: Colors.onAccent,
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
  message: {
    color: Colors.accentSoft,
    fontSize: 13,
    marginBottom: 8,
  },
  priceMove: {
    color: Colors.up,
    fontSize: 15,
    fontWeight: "800",
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
