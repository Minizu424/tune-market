import { useWindowDimensions } from "react-native";

/**
 * 画面幅からレイアウトを決める。
 *
 * 基準はスマホ。横幅が広いときだけタイル状（グリッド）に切り替える。
 * Web で開いたときに一覧の行が画面幅いっぱいに伸びてしまうのを防ぐ。
 */

/** タイル表示に切り替える幅 */
export const WIDE_BREAKPOINT = 760;

/** 読み物・フォーム系の1カラム最大幅 */
export const CONTENT_MAX_WIDTH = 720;

/** 一覧をタイルで並べるときの最大幅 */
export const GRID_MAX_WIDTH = 1080;

/** タイル1枚の目標幅（これを基準に列数を決める） */
const TILE_TARGET_WIDTH = 260;

export type LayoutInfo = {
  width: number;
  /** タイル表示にするか */
  isWide: boolean;
  /** 一覧の列数（1ならリスト表示） */
  columns: number;
};

export function useLayout(): LayoutInfo {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  if (!isWide) {
    return { width, isWide: false, columns: 1 };
  }

  const usable = Math.min(width - 40, GRID_MAX_WIDTH);
  const columns = Math.max(2, Math.min(4, Math.floor(usable / TILE_TARGET_WIDTH)));

  return { width, isWide: true, columns };
}
