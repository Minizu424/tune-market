/**
 * Tune Market 配色トークン
 *
 * 2系統ある。
 *
 * 1. Colors        …… ライト基調。アプリの大半の画面で使う。
 * 2. OverlayColors …… ジャケット画像の上に重ねる画面（リール・ミニプレイヤー・
 *                      コメントシート）で使うダーク。写真の上では明るいUIだと
 *                      文字が読めないため、ここだけは暗いままにする。
 *
 * キー名は2系統で共通にしてある。ダーク側の画面は
 *   import { OverlayColors as Colors } from "@/constants/colors";
 * と読み替えるだけで切り替わる。
 */

/** ライト基調（既定） */
export const Colors = {
  /** 画面の下地。真っ白ではなく少し温かみのあるグレーにして、白いカードを浮かせる */
  background: "#E9E7E0",
  /** カード面 */
  card: "#FFFFFF",
  /** 罫線 */
  cardBorder: "#D6D2C8",
  /** 入力欄・くぼんだ面 */
  input: "#F4F2ED",
  /** 主役の操作色。白文字を載せてコントラストが取れる濃さにしてある */
  accent: "#5B4BD4",
  /** アクセント系の文字色。白背景で読める濃さ */
  accentSoft: "#4F41BC",
  /** 本文 */
  text: "#1B1A18",
  /** 補助テキスト */
  textMuted: "#5F5C55",
  /** 注釈・プレースホルダ */
  textFaint: "#6A6760",
  /** 上昇 */
  up: "#0F6E56",
  /** 下落 */
  down: "#B3382B",
  /** バッジなどの強調 */
  gold: "#8F5D08",
  /** 色付き面に載せる文字（アクセント地・ゴールド地の上） */
  onAccent: "#FFFFFF",
  onGold: "#412402",
} as const;

/** ジャケット画像の上に重ねる面で使うダーク */
export const OverlayColors = {
  background: "#0B0D12",
  card: "#171A21",
  cardBorder: "#2A2E38",
  input: "#1E222B",
  accent: "#8357E7",
  accentSoft: "#C4B5FD",
  text: "#FFFFFF",
  textMuted: "#B7BCC6",
  textFaint: "#8A8F99",
  up: "#4ADE80",
  down: "#F87171",
  gold: "#FBBF24",
  onAccent: "#FFFFFF",
  onGold: "#412402",
} as const;

export type ColorToken = keyof typeof Colors;
