import { DefaultTheme, ThemeProvider, type Theme } from "@react-navigation/native";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { MiniPlayer } from "@/components/player/MiniPlayer";
import { Colors } from "@/constants/colors";
import { PlaybackProvider } from "@/contexts/PlaybackContext";

/**
 * アプリはライト基調で固定する。
 * 端末がダークモードでも配色が入れ替わらないようにして、
 * 画面ごとの見え方を安定させる（リールだけは OverlayColors で暗いまま）。
 */
const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.background,
    card: Colors.card,
    text: Colors.text,
    border: Colors.cardBorder,
    primary: Colors.accent,
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={navigationTheme}>
      <PlaybackProvider>
        <StatusBar style="dark" />
        <AnimatedSplashOverlay />
        <Slot />
        <MiniPlayer />
      </PlaybackProvider>
    </ThemeProvider>
  );
}
