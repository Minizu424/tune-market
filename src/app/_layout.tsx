import { DarkTheme, DefaultTheme, Slot, ThemeProvider } from "expo-router";
import { useColorScheme } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { MiniPlayer } from "@/components/player/MiniPlayer";
import { PlaybackProvider } from "@/contexts/PlaybackContext";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <PlaybackProvider>
        <AnimatedSplashOverlay />
        <Slot />
        <MiniPlayer />
      </PlaybackProvider>
    </ThemeProvider>
  );
}
