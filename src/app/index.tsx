import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { auth, db } from "../src/lib/firebase";

export default function Index() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const createUserDocument = async (uid: string, userEmail: string) => {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return;
    }

    await setDoc(userRef, {
      email: userEmail,
      displayName: "",
      role: "listener",
      pointBalance: 100,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  const handleSignUp = async () => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await createUserDocument(result.user.uid, result.user.email ?? email);
      Alert.alert("登録成功", "初期ポイント100ptを付与しました。");
    } catch (error) {
      console.error(error);
      Alert.alert("登録失敗", "メールアドレスまたはパスワードを確認してください。");
    }
  };

  const handleLogin = async () => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await createUserDocument(result.user.uid, result.user.email ?? email);
      Alert.alert("ログイン成功", "Tune Marketへようこそ。");
    } catch (error) {
      console.error(error);
      Alert.alert("ログイン失敗", "メールアドレスまたはパスワードを確認してください。");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tune Market</Text>
      <Text style={styles.subtitle}>音楽を見つけて、応援して、育てる。</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="メールアドレス"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="パスワード"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable style={styles.primaryButton} onPress={handleLogin}>
          <Text style={styles.primaryButtonText}>ログイン</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={handleSignUp}>
          <Text style={styles.secondaryButtonText}>新規登録</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#10111f",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: "#ffffff",
    fontSize: 36,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    color: "#b6b7c8",
    fontSize: 14,
    marginBottom: 32,
  },
  form: {
    width: "100%",
    gap: 12,
  },
  input: {
    backgroundColor: "#1b1d32",
    color: "#ffffff",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: "#7c5cff",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryButton: {
    borderColor: "#7c5cff",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#c9c2ff",
    fontWeight: "700",
    fontSize: 16,
  },
});