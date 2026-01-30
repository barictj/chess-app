import React from "react";
import {
  View,
  Text,
  Platform,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

import { LoadState, msg } from "../../lib/loadState";
import {
  getUserProfile,
  deleteUserAccount,
  setUserAvatarUrl,
} from "../../lib/api";
import { confirm } from "../compononents/Shared/Confirm";
import { useTheme } from "../../lib/ThemeContext";
import { boardThemes } from "../../lib/boards";

export default function ProfileScreen() {
  const router = useRouter();
  const { theme, mode, setMode, boardKey, setBoardKey } = useTheme();

  const [profileS, setProfileS] = useState<LoadState<any>>({
    status: "loading",
    data: null,
    error: null,
  });

  const [busy, setBusy] = useState<{ avatar?: boolean }>({});

  // --- avatar URL modal state ---
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarInput, setAvatarInput] = useState("");

  const loadAll = useCallback(async () => {
    setProfileS((s) => ({ ...s, status: "loading", error: null }));
    try {
      const prof = await getUserProfile();
      setProfileS({ status: "ready", data: prof, error: null });
    } catch (e) {
      setProfileS({ status: "error", data: null, error: msg(e) });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll]),
  );

  const profile = profileS.data;

  async function logout() {
    if (Platform.OS === "web") localStorage.removeItem("auth_token");
    else await SecureStore.deleteItemAsync("auth_token");
    router.replace("/(auth)/login");
  }

  function isValidHttpUrl(s: string) {
    try {
      const u = new URL(s);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }

  function openAvatarPrompt() {
    setAvatarInput(profile?.avatar_url ?? "");
    setAvatarModalOpen(true);
  }

  async function submitAvatarUrl() {
    const url = avatarInput.trim();

    if (!url) {
      Alert.alert("Avatar", "Please enter an avatar URL.");
      return;
    }
    if (!isValidHttpUrl(url)) {
      Alert.alert("Avatar", "Avatar URL must start with http:// or https://");
      return;
    }

    try {
      setBusy((b) => ({ ...b, avatar: true }));
      await setUserAvatarUrl(url);
      setAvatarModalOpen(false);
      await loadAll();
    } catch (e) {
      Alert.alert("Avatar", msg(e));
    } finally {
      setBusy((b) => ({ ...b, avatar: false }));
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
    >
      {/* Status */}
      {profileS.status === "error" ? (
        <Text style={{ color: "#E5484D", fontWeight: "900" }}>
          {profileS.error}
        </Text>
      ) : null}

      {/* Avatar URL modal */}
      <Modal
        transparent
        animationType="fade"
        visible={avatarModalOpen}
        onRequestClose={() => !busy.avatar && setAvatarModalOpen(false)}
      >
        {/* <View style={styles.overlay}>
          <View
            style={[
              styles.modal,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text
              style={{ color: theme.text, fontWeight: "900", fontSize: 18 }}
            >
              Change avatar
            </Text>
            <Text
              style={{ color: theme.subtext, fontWeight: "800", marginTop: 6 }}
            >
              Paste an image URL (required)
            </Text>

            <TextInput
              value={avatarInput}
              onChangeText={setAvatarInput}
              placeholder="https://example.com/avatar.png"
              placeholderTextColor={theme.subtext}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!busy.avatar}
              style={[
                styles.modalInput,
                { color: theme.text, borderColor: theme.border },
              ]}
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <Pressable
                disabled={!!busy.avatar}
                onPress={() => setAvatarModalOpen(false)}
                style={({ pressed }) => [
                  styles.modalBtn,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    opacity: busy.avatar ? 0.6 : 1,
                  },
                  pressed && !busy.avatar ? styles.pressed : null,
                ]}
              >
                <Text style={{ color: theme.text, fontWeight: "900" }}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                disabled={!!busy.avatar}
                onPress={submitAvatarUrl}
                style={({ pressed }) => [
                  styles.modalBtn,
                  {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                    opacity: busy.avatar ? 0.6 : 1,
                  },
                  pressed && !busy.avatar ? styles.pressed : null,
                ]}
              >
                <Text style={{ color: "#fff", fontWeight: "900" }}>
                  {busy.avatar ? "Updating…" : "Save"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View> */}
      </Modal>

      {/* Header card */}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={styles.avatarWrap}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatarImg}
              />
            ) : (
              <Text
                style={{
                  color: theme.subtext,
                  fontWeight: "900",
                  fontSize: 22,
                }}
              >
                {(profile?.username?.[0] ?? "?").toUpperCase()}
              </Text>
            )}
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{ fontSize: 20, fontWeight: "900", color: theme.text }}
              numberOfLines={1}
            >
              {profile?.username ? `@${profile.username}` : "—"}
            </Text>
            <Text
              style={{ marginTop: 4, color: theme.subtext, fontWeight: "800" }}
            >
              Rating: {profile?.rating ?? "—"}
            </Text>

            {/* <Pressable
              onPress={openAvatarPrompt}
              disabled={!!busy.avatar}
              style={({ pressed }) => [
                styles.smallBtn,
                {
                  backgroundColor: theme.primary,
                  borderColor: theme.primary,
                  opacity: busy.avatar ? 0.6 : 1,
                },
                pressed && !busy.avatar ? styles.pressed : null,
              ]}
            >
              <Text style={{ color: "#fff", fontWeight: "900" }}>
                {busy.avatar ? "Updating…" : "Change avatar"}
              </Text>
            </Pressable> */}
          </View>
        </View>
      </View>

      {/* Appearance */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        Appearance
      </Text>

      <View
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        {/* Dark mode toggle */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowText, { color: theme.text }]}>
              Dark mode
            </Text>
            <Text
              style={{ color: theme.subtext, fontWeight: "700", marginTop: 2 }}
            >
              Switch the whole app theme
            </Text>
          </View>
          <Switch
            value={mode === "dark"}
            onValueChange={(v) => setMode(v ? "dark" : "light")}
          />
        </View>

        <View style={{ height: 1, backgroundColor: theme.border }} />

        {/* Board picker */}
        <View style={[styles.row, { alignItems: "flex-start" }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowText, { color: theme.text }]}>
              Board style
            </Text>
            <Text
              style={{ color: theme.subtext, fontWeight: "700", marginTop: 2 }}
            >
              Tap to change
            </Text>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 10,
              }}
            >
              {Object.keys(boardThemes).map((k) => {
                const key = k as keyof typeof boardThemes;
                const selected = boardKey === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setBoardKey(key)}
                    style={({ pressed }) => [
                      styles.pill,
                      {
                        borderColor: selected ? theme.primary : theme.border,
                        backgroundColor: selected
                          ? "rgba(47,107,255,0.12)"
                          : theme.card,
                      },
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <Text style={{ color: theme.text, fontWeight: "900" }}>
                      {key}
                    </Text>
                    {/* tiny preview squares */}
                    <View
                      style={{ flexDirection: "row", gap: 6, marginTop: 6 }}
                    >
                      <View
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 4,
                          backgroundColor: boardThemes[key].light,
                          borderWidth: 1,
                          borderColor: "rgba(0,0,0,0.10)",
                        }}
                      />
                      <View
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 4,
                          backgroundColor: boardThemes[key].dark,
                          borderWidth: 1,
                          borderColor: "rgba(0,0,0,0.10)",
                        }}
                      />
                      <View
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 4,
                          backgroundColor: boardThemes[key].dark,
                          borderWidth: 1,
                          borderColor: "rgba(0,0,0,0.10)",
                        }}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      {/* Account */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Account</Text>

      <View
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <Pressable
          onPress={async () => {
            if (
              !(await confirm({
                message: "You will be signed out of your account.",
                confirmText: "Logout",
              }))
            )
              return;
            await logout();
          }}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <Text style={[styles.rowText, { color: theme.text }]}>Log out</Text>
          <Text
            style={{ color: theme.subtext, fontWeight: "900", fontSize: 18 }}
          >
            ›
          </Text>
        </Pressable>

        <View style={{ height: 1, backgroundColor: theme.border }} />

        <Pressable
          onPress={async () => {
            if (
              !(await confirm({
                message: "This action cannot be undone.",
                confirmText: "Delete",
                destructive: true,
              }))
            )
              return;

            try {
              await deleteUserAccount();
              await logout();
            } catch (e) {
              Alert.alert("Delete account", msg(e));
            }
          }}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <Text style={[styles.rowText, { color: "#E5484D" }]}>
            Delete account
          </Text>
          <Text
            style={{
              color: "rgba(229,72,77,0.85)",
              fontWeight: "900",
              fontSize: 18,
            }}
          >
            ›
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginTop: 12,
  },
  sectionTitle: {
    marginTop: 18,
    fontSize: 14,
    fontWeight: "900",
    paddingHorizontal: 2,
  },
  row: {
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowText: { fontSize: 16, fontWeight: "900" },
  pressed: { opacity: 0.96, transform: [{ scale: 0.995 }] },

  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.06)",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: { width: 72, height: 72 },

  smallBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },

  pill: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 110,
  },

  // --- modal styles ---
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  modal: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  modalInput: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: "800",
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
