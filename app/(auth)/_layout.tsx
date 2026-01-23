// app/(auth)/_layout.tsx
import { Stack, Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { getToken } from "../../lib/token";

export default function AuthLayout() {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const t = await getToken();
      setToken(t);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  // If already authed, leave auth group
  if (token) {
    return <Redirect href="/(tabs)" />;
  }

  // Not authed: show auth screens (login, etc)
  return <Stack screenOptions={{ headerShown: false }} />;
}
