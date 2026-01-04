// app/_layout.tsx
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";

export const unstable_settings = {
  skipLegacyRedirects: true,   // ⭐ prevents Expo from adding `--/`
};

export default function RootLayout() {
  console.log("ROOT LAYOUT LOADED");

  return (
    <GestureHandlerRootView style={styles.container}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
