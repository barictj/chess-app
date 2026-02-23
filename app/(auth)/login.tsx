import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import { setToken } from "../../lib/token";
import { useTheme } from "../../lib/ThemeContext";
import * as AppleAuthentication from "expo-apple-authentication";
import { BACKEND_URL } from "../../lib/config";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const theme = useTheme().theme;
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (typeof token === "string" && token.length > 0) {
        await setToken(token);
        router.replace("/(tabs)");
      }
    })();
  }, [token]);

  useEffect(() => {
    const sub = Linking.addEventListener("url", async ({ url }) => {
      const parsed = Linking.parse(url);
      const t = parsed.queryParams?.token;

      if (typeof t === "string" && t.length > 0) {
        await setToken(t);
        router.replace("/(tabs)");
      }
    });

    return () => sub.remove();
  }, []);

  async function loginWithGoogle() {
    try {
      setAuthBusy(true);
      const redirectUri = Linking.createURL("login");
      const authUrl = `${BACKEND_URL}/auth/google?redirect_uri=${encodeURIComponent(redirectUri)}`;

      try {
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

        if (result.type === "cancel") return;

        if (result.type === "success" && result.url) {
          const parsed = Linking.parse(result.url);
          const t = parsed.queryParams?.token;
          if (typeof t === "string" && t.length > 0) {
            await setToken(t);
            router.replace("/(tabs)");
          }
        }
      } catch {
        await Linking.openURL(authUrl);
        Alert.alert(
          "Browser opened",
          "Complete login in your browser, then return to the app.",
        );
      }
    } catch (e: any) {
      Alert.alert("Login error", e?.message ?? String(e));
    } finally {
      setAuthBusy(false);
    }
  }

  async function loginWithApple() {
    try {
      setAuthBusy(true);

      if (!BACKEND_URL || typeof BACKEND_URL !== "string") {
        throw new Error("BACKEND_URL is missing. Set EXPO_PUBLIC_BACKEND_URL and restart Expo.");
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

      const res = await fetch(`${BACKEND_URL}/auth/apple`, {
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
      Alert.alert("Apple login error", e?.message ?? String(e));
    } finally {
      setAuthBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.glowA, { backgroundColor: `${theme.primary}22` }]} />
      <View style={[styles.glowB, { backgroundColor: `${theme.primary}14` }]} />

      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.logoWrap}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={[styles.title, { color: theme.text }]}>Play chess your way</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>
            Start a game with friends, random opponents, or train with the bot.
          </Text>

          <View style={styles.bulletWrap}>
            <Text style={[styles.bullet, { color: theme.subtext }]}>- Daily pace, no move timer stress</Text>
            <Text style={[styles.bullet, { color: theme.subtext }]}>- Live invites and active game tracking</Text>
            <Text style={[styles.bullet, { color: theme.subtext }]}>- Continue on any device with your account</Text>
          </View>

          <Pressable
            onPress={loginWithGoogle}
            disabled={authBusy}
            style={({ pressed }) => [
              styles.googleBtn,
              authBusy && styles.disabled,
              pressed && !authBusy && styles.pressed,
            ]}
          >
            <Image
              source={require("../../assets/images/google.png")}
              style={styles.googleIcon}
              resizeMode="contain"
            />
            <Text style={styles.googleText}>{authBusy ? "Opening..." : "Continue with Google"}</Text>
          </Pressable>

          {Platform.OS === "ios" && (
            <View style={{ marginTop: 12 }}>
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={18}
                style={{ width: "100%", height: 48, opacity: authBusy ? 0.6 : 1 }}
                onPress={loginWithApple}
              />
            </View>
          )}

          {Platform.OS !== "ios" && (
            <Text style={[styles.altText, { color: theme.subtext }]}>Sign in with Apple is available on iOS.</Text>
          )}

          <Text style={[styles.footer, { color: theme.subtext }]}>By continuing, you agree to our Terms and Privacy Policy.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  glowA: {
    position: "absolute",
    top: -120,
    right: -70,
    width: 260,
    height: 260,
    borderRadius: 160,
  },

  glowB: {
    position: "absolute",
    bottom: -120,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 160,
  },

  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
  },

  logoWrap: {
    alignItems: "center",
    marginBottom: 8,
  },

  logo: {
    width: 190,
    height: 190,
  },

  title: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  subtitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },

  bulletWrap: {
    marginTop: 14,
    gap: 6,
  },

  bullet: {
    fontSize: 13,
    fontWeight: "600",
  },

  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderColor: "#dadce0",
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 14,
    marginTop: 20,
  },

  googleIcon: {
    width: 28,
    height: 28,
  },

  googleText: {
    color: "#1f1f1f",
    fontSize: 16,
    fontWeight: "700",
  },

  altText: {
    opacity: 0.7,
    textAlign: "center",
    marginTop: 12,
    fontSize: 12,
    fontWeight: "600",
  },

  footer: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.9,
  },

  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.96,
  },

  disabled: {
    opacity: 0.65,
  },
});
