// chess/chessapp/app/(auth)/login.tsx
import React, { useEffect } from "react";
import {
  View,
  Text,
  Button,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
} from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import { setToken } from "../../lib/token";
import Constants from "expo-constants";
import { useTheme } from "../../lib/ThemeContext";
import * as AppleAuthentication from "expo-apple-authentication";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();

  // Handle token if present in params
  useEffect(() => {
    (async () => {
      if (typeof token === "string" && token.length > 0) {
        console.log(`[login] token from params len=${token.length}`);
        await setToken(token);
        router.replace("/(tabs)");
      }
    })();
  }, [token]);

  // Deep link listener (native)
  useEffect(() => {
    const sub = Linking.addEventListener("url", async ({ url }) => {
      const parsed = Linking.parse(url);
      const t = parsed.queryParams?.token;

      if (typeof t === "string" && t.length > 0) {
        console.log(`[login] token from Linking event len=${t.length}`);
        await setToken(t);
        router.replace("/(tabs)");
      }
    });

    return () => sub.remove();
  }, []);

  async function loginWithGoogle() {
    try {
      const backend = Constants.expoConfig?.extra?.BACKEND_URL;

      if (!backend || typeof backend !== "string") {
        throw new Error(
          "BACKEND_URL is missing. Check app.json/app.config.js expo.extra.BACKEND_URL and restart expo.",
        );
      }

      // IMPORTANT: if backend is localhost on a real phone, it will NOT work
      // Example bad: http://localhost:3000
      // Use LAN IP:  http://192.168.x.x:3000  (or a tunnel)
      const redirectUri = Linking.createURL("login");

      const authUrl =
        `${backend}/auth/google?redirect_uri=` +
        encodeURIComponent(redirectUri);

      console.log("[login] Platform:", Platform.OS);
      console.log("[login] backend:", backend);
      console.log("[login] redirectUri:", redirectUri);
      console.log("[login] authUrl:", authUrl);

      // Try AuthSession (preferred)
      try {
        const result = await WebBrowser.openAuthSessionAsync(
          authUrl,
          redirectUri,
        );
        console.log("[login] openAuthSessionAsync result:", result);

        // If user cancels, do nothing
        if (result.type === "cancel") return;

        // If it returns a URL, parse token from it (some flows do this)
        if (result.type === "success" && result.url) {
          const parsed = Linking.parse(result.url);
          const t = parsed.queryParams?.token;
          if (typeof t === "string" && t.length > 0) {
            console.log(`[login] token from result.url len=${t.length}`);
            await setToken(t);
            router.replace("/(tabs)");
          }
        }
      } catch (e: any) {
        // Fallback for: "No matching browser activity found"
        console.log("[login] openAuthSessionAsync failed:", String(e));

        // Open in system handler instead (plain browser)
        await Linking.openURL(authUrl);

        Alert.alert(
          "Browser opened",
          "Complete login in your browser, then return to the app.",
        );
      }
    } catch (e: any) {
      console.log("[login] loginWithGoogle error:", e?.message ?? String(e));
      Alert.alert("Login error", e?.message ?? String(e));
    }
  }
  async function loginWithApple() {
    try {
      const backend = Constants.expoConfig?.extra?.BACKEND_URL;
      if (!backend || typeof backend !== "string") {
        throw new Error(
          "BACKEND_URL is missing. Set EXPO_PUBLIC_BACKEND_URL and restart Expo.",
        );
      }

      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!cred.identityToken) {
        throw new Error("No identityToken returned from Apple");
      }

      const res = await fetch(`${backend}/auth/apple`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identityToken: cred.identityToken,
          email: cred.email,
          fullName: cred.fullName,
        }),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

      const data = JSON.parse(text);
      if (!data?.token) throw new Error("Backend did not return token");

      await setToken(data.token);
      router.replace("/(tabs)");
    } catch (e: any) {
      console.log("[login] loginWithApple error:", e?.message ?? String(e));
      Alert.alert("Apple login error", e?.message ?? String(e));
    }
  }

  const { theme } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      {/* Card */}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        {/* Logo / Title */}
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <Text style={[styles.title, { color: theme.text }]}>dotChess</Text>
          <Text
            style={{
              position: "absolute",
              bottom: 6,
              right: 6,
              fontSize: 10,
              opacity: 0.6,
            }}
          >
            BUILD: android-prod-2026-01-27-A
          </Text>

          <Text style={[styles.subtitle, { color: theme.subtext }]}>
            Play with your friends at your own time.
          </Text>
        </View>

        {/* Login button */}
        <Pressable
          onPress={loginWithGoogle}
          style={({ pressed }) => [
            styles.primaryBtn,
            {
              backgroundColor: theme.primary,
              borderColor: theme.primary,
            },
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryText}>Continue with Google</Text>
        </Pressable>
        {Platform.OS === "ios" && (
          <View style={{ marginTop: 12 }}>
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={
                AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
              }
              buttonStyle={
                AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={18}
              style={{ width: "100%", height: 48 }}
              onPress={loginWithApple}
            />
          </View>
        )}
        {Platform.OS !== "ios" && (
          <Text style={{ opacity: 0.5, textAlign: "center", marginTop: 12 }}>
            Sign in with Apple is available on iOS
          </Text>
        )}

        {/* Fine print */}
        <Text style={[styles.footer, { color: theme.subtext }]}>
          By continuing, you agree to our Terms & Privacy Policy.
        </Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
  },

  title: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0.4,
  },

  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "700",
  },

  primaryBtn: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  primaryText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  footer: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.9,
  },

  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.96,
  },
});
