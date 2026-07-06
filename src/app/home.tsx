import { StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ホーム</Text>
      <Text style={styles.text}>Tune Market ホーム画面</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#061226",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  text: {
    color: "#9CA3AF",
    fontSize: 14,
  },
});