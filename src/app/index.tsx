import { router } from "expo-router";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { notify } from "@/lib/notify";
import { Colors } from "@/constants/colors";
import { auth } from "@/lib/firebase";
import { createUserDocument } from "@/repositories/usersRepository";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/home");
      } else {
        setChecking(false);
      }
    });
    return unsubscribe;
  }, []);

  const handleSignUp = async () => {
    setSubmitting(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await createUserDocument(result.user.uid, result.user.email ?? email);
      notify("登録成功", "初期ポイント100ptを付与しました。");
      router.replace("/home");
    } catch (error) {
      console.error(error);
      notify("登録失敗", "メールアドレスまたはパスワードを確認してください。");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async () => {
    setSubmitting(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await createUserDocument(result.user.uid, result.user.email ?? email);
      router.replace("/home");
    } catch (error) {
      console.error(error);
      notify("ログイン失敗", "メールアドレスまたはパスワードを確認してください。");
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tune Market</Text>
      <Text style={styles.subtitle}>音楽を見つけて、応援して、育てる。</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="メールアドレス"
          placeholderTextColor={Colors.textFaint}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="パスワード"
          placeholderTextColor={Colors.textFaint}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable
          style={[styles.primaryButton, submitting && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={submitting}
        >
          <Text style={styles.primaryButtonText}>
            {submitting ? "処理中..." : "ログイン"}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.secondaryButton, submitting && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={submitting}
        >
          <Text style={styles.secondaryButtonText}>新規登録（100ptプレゼント）</Text>
        </Pressable>
      </View>

      <Text style={styles.disclaimer}>
        本アプリの「株」はゲーム内の仕組みであり、実際の金融商品ではありません。{"\n"}
        ポイントは現金化できません。
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: Colors.text,
    fontSize: 36,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 14,
    marginBottom: 32,
  },
  form: {
    width: "100%",
    gap: 12,
  },
  input: {
    backgroundColor: Colors.input,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: Colors.onAccent,
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryButton: {
    borderColor: Colors.accent,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: Colors.accentSoft,
    fontWeight: "700",
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  disclaimer: {
    color: Colors.textFaint,
    fontSize: 11,
    textAlign: "center",
    marginTop: 28,
    lineHeight: 16,
  },
});
