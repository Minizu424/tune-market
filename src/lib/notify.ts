import { Alert, Platform } from "react-native";

/**
 * クロスプラットフォーム対応の通知ダイアログ。
 *
 * react-native-web では Alert.alert が何も表示しない（no-op）ため、
 * Webブラウザでは window.alert を使って必ずメッセージが見えるようにする。
 * 「楽曲投稿でボタンを押しても何も起きない」ように見える問題の原因はこれだった。
 */
export function notify(title: string, message?: string): void {
  const text = message ? `${title}\n\n${message}` : title;

  if (Platform.OS === "web") {
    const globalAlert = (globalThis as { alert?: (msg: string) => void }).alert;
    if (typeof globalAlert === "function") {
      globalAlert(text);
    } else {
      console.warn(text);
    }
    return;
  }

  Alert.alert(title, message);
}
