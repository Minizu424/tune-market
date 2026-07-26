/**
 * Tune Market 配色トークン
 *
 * 参考にしたアプリ（TradingView / Woodstock / Instagram / YouTube Music）から
 * 読み取った構造:
 *
 * - 一覧はカードを使わず、真っ白の地に細い区切り線でフラットに並べる
 * - 数字（価格・騰落）が主役。騰落は緑／赤の素のテキスト
 * - 主要ボタンは黒のピル。色数を絞ってモノクロ＋損益色に寄せる
 * - メディアを主役にする画面（リール・プレイヤー）だけ暗い
 *
 * そのため2系統を持つ。
 *
 * 1. Colors        …… 白基調。アプリの大半
 * 2. OverlayColors …… ジャケット画像の上に重なる画面
 *
 * キー名は共通なので、暗いままにする画面は
 *   import { OverlayColors as Colors } from "@/constants/colors";
 * と読み替えるだけで切り替わる。
 */

/** 白基調（既定） */
export const Colors = {
  /** 画面の地。純白は目が疲れるので、わずかに温かみのあるオフホワイトにする */
  background: "#FAFAF8",
  /** カード・シート。地より一段明るいので、わずかに浮いて見える */
  card: "#FFFFFF",
  /** 区切り線・ヘアライン */
  cardBorder: "#E5E4DF",
  /** 検索欄などの入力面。地より一段暗くしてくぼませる */
  input: "#F0EFEB",
  /** 一段くぼんだ面（統計ブロックなど） */
  subtle: "#F4F3EF",
  /** 主要ボタン。参考アプリに合わせて黒に寄せる */
  accent: "#111113",
  /** リンク・選択中の文字 */
  accentSoft: "#3A3A3E",
  /** 本文 */
  text: "#111113",
  /** 補助テキスト */
  textMuted: "#57575F",
  /** 注釈・プレースホルダ */
  textFaint: "#6C6C73",
  /** 上昇 */
  up: "#127C59",
  /** 下落 */
  down: "#C4342B",
  /** バッジなどの強調 */
  gold: "#8F5D08",
  /** 色付き面に載せる文字 */
  onAccent: "#FFFFFF",
  onGold: "#412402",
} as const;

/** ジャケット画像の上に重なる面で使うダーク */
export const OverlayColors = {
  background: "#0B0B0D",
  card: "#17181C",
  cardBorder: "#2B2C31",
  input: "#1F2024",
  subtle: "#17181C",
  accent: "#FFFFFF",
  accentSoft: "#D8D8DD",
  text: "#FFFFFF",
  textMuted: "#B4B4BC",
  textFaint: "#8A8A93",
  up: "#3DDC97",
  down: "#FF6B60",
  gold: "#FBBF24",
  onAccent: "#111113",
  onGold: "#412402",
} as const;

export type ColorToken = keyof typeof Colors;
