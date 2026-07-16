import { Redirect } from "expo-router";

/**
 * テンプレート由来のデモ画面（SDK 54互換のためリダイレクトに置き換え）。
 * Tune Market ではホームがリール画面のため、この画面は使用しない。
 */
export default function ExploreScreen() {
  return <Redirect href="/home" />;
}
