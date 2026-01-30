// app/_layout.tsx
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, ThemeProvider } from "../lib/ThemeContext";
import SiteHeader from "./compononents/Shared/SiteHeader";
import { StatusBar } from "expo-status-bar";
export default function RootLayout() {
  const { theme, mode } = useTheme();

  return (
    <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
          <StatusBar
            style={mode === "dark" ? "light" : "dark"}
            backgroundColor={theme.bg} // Android only, safe to keep
          />

          <SiteHeader title="dotChess" theme={theme} />

          <Stack
            screenOptions={{ headerShown: false }}
            initialRouteName="(auth)"
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </SafeAreaView>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}
