// chess/chessapp/app/index.tsx

import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { getToken } from "../lib/token";
export default function Index() {
  useEffect(() => {
    (async () => {
      const token = await getToken();
      console.log("JWT:", token);
      router.replace(token ? "/(tabs)" : "/(auth)/login");
    })();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator />
    </View>
  );
}
