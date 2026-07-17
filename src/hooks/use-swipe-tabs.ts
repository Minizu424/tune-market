import { router, usePathname } from "expo-router";
import { useRef } from "react";
import { PanResponder } from "react-native";

/** 下タブと同じ並び順（横スワイプでこの順に移動する） */
const TAB_ORDER = ["/home", "/songs", "/portfolio", "/ranking", "/mypage"];

const SWIPE_DISTANCE = 60;

/**
 * 画面の横スワイプで隣のタブへ移動するためのPanResponder。
 * 左スワイプ=次のタブ、右スワイプ=前のタブ。
 * 縦スクロールや横スクロールUI（チップ列など）とぶつからないよう、
 * 横方向が縦方向の2倍以上の大きな動きだけに反応する。
 */
export function useSwipeTabs() {
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dx) > SWIPE_DISTANCE &&
        Math.abs(gesture.dx) > Math.abs(gesture.dy) * 2,
      onPanResponderRelease: (_event, gesture) => {
        const current = TAB_ORDER.findIndex((path) =>
          pathRef.current.startsWith(path),
        );
        if (current < 0) {
          return;
        }
        const direction = gesture.dx < 0 ? 1 : -1;
        const next = current + direction;
        if (next < 0 || next >= TAB_ORDER.length) {
          return;
        }
        router.navigate(TAB_ORDER[next] as never);
      },
    }),
  ).current;

  return responder.panHandlers;
}
