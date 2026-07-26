import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Colors } from "@/constants/colors";

const MAX_TAGS = 5;
const MAX_TAG_LENGTH = 12;

type TagInputProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
};

/**
 * タグの追加・削除ができる入力欄。
 * 入力して「追加」でチップになり、チップの✕で削除できる。
 */
export function TagInput({ tags, onChange }: TagInputProps) {
  const [text, setText] = useState("");

  const addTag = () => {
    const tag = text.trim().replace(/^#/, "");
    if (!tag) {
      return;
    }
    if (tags.includes(tag) || tags.length >= MAX_TAGS) {
      setText("");
      return;
    }
    onChange([...tags, tag.slice(0, MAX_TAG_LENGTH)]);
    setText("");
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  return (
    <View>
      {tags.length > 0 && (
        <View style={styles.chips}>
          {tags.map((tag) => (
            <Pressable key={tag} style={styles.chip} onPress={() => removeTag(tag)}>
              <Text style={styles.chipText}># {tag}</Text>
              <Text style={styles.chipRemove}>✕</Text>
            </Pressable>
          ))}
        </View>
      )}

      {tags.length < MAX_TAGS && (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="例：作業用、夜に聴きたい、Jazz"
            placeholderTextColor={Colors.textFaint}
            maxLength={MAX_TAG_LENGTH}
            onSubmitEditing={addTag}
            returnKeyType="done"
          />
          <Pressable
            style={[styles.addButton, !text.trim() && styles.addButtonDisabled]}
            onPress={addTag}
            disabled={!text.trim()}
          >
            <Text style={styles.addButtonText}>追加</Text>
          </Pressable>
        </View>
      )}
      <Text style={styles.hint}>
        最大{MAX_TAGS}個。タップで削除できます
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "rgba(91, 75, 212, 0.12)",
    borderColor: Colors.accent,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipText: {
    color: Colors.accentSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  chipRemove: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.input,
    color: Colors.text,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  addButton: {
    borderRadius: 12,
    backgroundColor: Colors.accent,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  addButtonText: {
    color: Colors.onAccent,
    fontSize: 14,
    fontWeight: "700",
  },
  hint: {
    color: Colors.textFaint,
    fontSize: 11,
    marginTop: 6,
  },
});
