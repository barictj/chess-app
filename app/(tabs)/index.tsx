import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  // Button,   // <-- optional: remove if you switch fully
  TextInput,
  FlatList,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";

import {
  createGame,
  findRandomGame,
  getUserProfile,
  playAgainstBot,
  getGameInvites,
  acceptInvitedGame,
  denyInvitedGame,
  getActiveGames,
} from "../../lib/api";

import InviteCard from "../compononents/Home/InviteCard";
import GameCard from "../compononents/Home/GameCard";
import { useTheme } from "../../lib/ThemeContext";
import { LoadState, msg } from "../../lib/loadState";
import { ErrorBanner, SkeletonRow } from "../compononents/Shared/States";

function CwfButton({
  title,
  onPress,
  disabled,
  variant = "primary",
  theme,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  theme: {
    primary: string;
    text: string;
    border: string;
    card: string;
  };
}) {
  const bg = variant === "primary" ? theme.primary : theme.card;
  const fg = variant === "primary" ? "#fff" : theme.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderColor: theme.border },
        variant === "secondary" && styles.btnSecondary,
        disabled && styles.btnDisabled,
        pressed && !disabled && styles.btnPressed,
      ]}
    >
      <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export default function Lobby() {
  const { theme } = useTheme();

  // ---- helpers (must be above loadAll)
  function minsSince(ts?: string) {
    if (!ts) return Infinity;
    return Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  }

  function withOpponentUsername(game: any, profile: any) {
    if (!profile) return game;
    const opponentUsername =
      game.white_user_id === profile.id
        ? game.black_username
        : game.white_username;
    return { ...game, opponent_username: opponentUsername };
  }

  function getOpponentUsername(row: any, profile: any) {
    const myId = profile?.id;
    if (!myId) return "—";

    if (row.white_user_id === myId) return row.black_username ?? "—";
    if (row.black_user_id === myId) return row.white_username ?? "—";

    if (row.invited_user_id === myId) {
      if (row.white_user_id && row.white_user_id !== myId)
        return row.white_username ?? "—";
      if (row.black_user_id && row.black_user_id !== myId)
        return row.black_username ?? "—";
      return row.white_username ?? row.black_username ?? "—";
    }

    return "—";
  }

  // ---- UI state
  const [username, setUsername] = useState("");

  const [profileS, setProfileS] = useState<LoadState<any>>({
    status: "loading",
    data: null,
    error: null,
  });

  const [invitesS, setInvitesS] = useState<LoadState<any[]>>({
    status: "loading",
    data: null,
    error: null,
  });

  const [gamesS, setGamesS] = useState<LoadState<any[]>>({
    status: "loading",
    data: null,
    error: null,
  });

  const [busy, setBusy] = useState<{
    inviteUser?: boolean;
    random?: boolean;
    bot?: boolean;
    acceptId?: string;
    denyId?: string;
  }>({});

  // ---- main loader
  const loadAll = useCallback(async () => {
    setProfileS((s) => ({ ...s, status: "loading", error: null }));
    setInvitesS((s) => ({ ...s, status: "loading", error: null }));
    setGamesS((s) => ({ ...s, status: "loading", error: null }));

    try {
      const [prof, games, inv] = await Promise.all([
        getUserProfile(),
        getActiveGames(),
        getGameInvites(),
      ]);

      setProfileS({ status: "ready", data: prof, error: null });

      const enriched = prof
        ? games.map((g: any) => withOpponentUsername(g, prof))
        : games;

      const sorted = enriched.sort((a: any, b: any) => {
        const aMyTurn = prof && a.to_move_user_id === prof.id;
        const bMyTurn = prof && b.to_move_user_id === prof.id;
        if (aMyTurn !== bMyTurn) return aMyTurn ? -1 : 1;
        return minsSince(b.last_move_at) - minsSince(a.last_move_at);
      });

      setGamesS({
        status: sorted.length ? "ready" : "empty",
        data: sorted,
        error: null,
      });

      setInvitesS({
        status: inv.length ? "ready" : "empty",
        data: inv,
        error: null,
      });

      if (prof?.username_set === 0) router.replace("/set-username");
    } catch (e) {
      const m = msg(e);
      setProfileS({ status: "error", data: null, error: m });
      setInvitesS((s) => ({ status: "error", data: s.data, error: m }) as any);
      setGamesS((s) => ({ status: "error", data: s.data, error: m }) as any);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll]),
  );

  const profile = profileS.data;
  const invites = invitesS.data ?? [];
  const games = (gamesS.data ?? []).slice().sort((a, b) => {
    // 1) your turn first
    const aMyTurn = a.to_move_user_id === profile.id;
    const bMyTurn = b.to_move_user_id === profile.id;
    if (aMyTurn !== bMyTurn) return aMyTurn ? -1 : 1;

    // 2) longest since last move first (oldest date first)
    const aTime = new Date(a.last_move_at ?? a.created_at).getTime();
    const bTime = new Date(b.last_move_at ?? b.created_at).getTime();
    return aTime - bTime;
  });

  // ---- mutations (with busy + refresh)
  async function onRandomGame() {
    try {
      setBusy((b) => ({ ...b, random: true }));
      const game = await findRandomGame();
      router.push(`/game/${game.id}`);
    } catch (e) {
      setGamesS(
        (s) => ({ status: "error", data: s.data, error: msg(e) }) as any,
      );
    } finally {
      setBusy((b) => ({ ...b, random: false }));
    }
  }

  async function onInvite() {
    try {
      setBusy((b) => ({ ...b, inviteUser: true }));
      const game = await createGame(username);
      router.push(`/game/${game.id}`);
    } catch (e) {
      setInvitesS(
        (s) => ({ status: "error", data: s.data, error: msg(e) }) as any,
      );
    } finally {
      setBusy((b) => ({ ...b, inviteUser: false }));
    }
  }

  async function onPlayBot() {
    try {
      setBusy((b) => ({ ...b, bot: true }));
      const game = await playAgainstBot();
      router.push(`/game/${game.id}`);
    } catch (e) {
      setGamesS(
        (s) => ({ status: "error", data: s.data, error: msg(e) }) as any,
      );
    } finally {
      setBusy((b) => ({ ...b, bot: false }));
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      {/* Header card */}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        {profileS.status === "loading" ? (
          <Text style={[styles.h1, { color: theme.text }]}>Loading…</Text>
        ) : profileS.status === "error" ? (
          <ErrorBanner text={profileS.error} onRetry={loadAll} />
        ) : (
          <>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              {/* LEFT COLUMN: avatar */}
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatarImg}
                />
              ) : (
                <View style={styles.avatarWrap}>
                  <Text
                    style={{
                      color: theme.subtext,
                      fontWeight: "900",
                      fontSize: 22,
                    }}
                  >
                    {(profile?.username?.[0] ?? "?").toUpperCase()}
                  </Text>
                </View>
              )}

              {/* RIGHT COLUMN: text */}
              <View>
                <Text style={[styles.h1, { color: theme.text }]}>
                  @{profile.username}
                </Text>
                <Text style={[styles.sub, { color: theme.subtext }]}>
                  Rating: {profile.rating}
                </Text>
              </View>
            </View>
          </>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <CwfButton
          theme={theme}
          title={busy.random ? "Finding..." : "Find Game"}
          onPress={onRandomGame}
          disabled={!!busy.random}
        />
        <CwfButton
          theme={theme}
          variant="secondary"
          title={busy.bot ? "Starting..." : "Play A.I. Bot"}
          onPress={onPlayBot}
          disabled={!!busy.bot}
        />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollPad}>
        {/* Invites */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.h2, { color: theme.text }]}>Game Invites</Text>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          {invitesS.status === "loading" ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : invitesS.status === "error" ? (
            <ErrorBanner text={invitesS.error} onRetry={loadAll} />
          ) : invitesS.status === "empty" ? (
            <Text style={[styles.empty, { color: theme.subtext }]}>
              No game invites
            </Text>
          ) : (
            <FlatList
              data={invites}
              scrollEnabled={false}
              keyExtractor={(item) => `invite-${item.id}`}
              renderItem={({ item }) => (
                <InviteCard
                  invite={item}
                  inviteUsername={getOpponentUsername(item, profile)}
                  onAccept={async () => {
                    try {
                      setBusy((b) => ({ ...b, acceptId: String(item.id) }));
                      await acceptInvitedGame(item.id);
                      await loadAll();
                      router.push(`/game/${item.id}`);
                    } catch (e) {
                      setInvitesS(
                        (s) =>
                          ({
                            status: "error",
                            data: s.data,
                            error: msg(e),
                          }) as any,
                      );
                    } finally {
                      setBusy((b) => ({ ...b, acceptId: undefined }));
                    }
                  }}
                  onDeny={async () => {
                    try {
                      setBusy((b) => ({ ...b, denyId: String(item.id) }));
                      await denyInvitedGame(item.id);
                      await loadAll();
                    } catch (e) {
                      setInvitesS(
                        (s) =>
                          ({
                            status: "error",
                            data: s.data,
                            error: msg(e),
                          }) as any,
                      );
                    } finally {
                      setBusy((b) => ({ ...b, denyId: undefined }));
                    }
                  }}
                />
              )}
            />
          )}
        </View>

        {/* Games */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.h2, { color: theme.text }]}>Active Games</Text>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          {gamesS.status === "loading" ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : gamesS.status === "error" ? (
            <ErrorBanner text={gamesS.error} onRetry={loadAll} />
          ) : gamesS.status === "empty" ? (
            <View>
              <Text style={[styles.empty, { color: theme.subtext }]}>
                No active games
              </Text>
              <View style={{ height: 10 }} />
              <CwfButton
                theme={theme}
                title={busy.random ? "Finding..." : "Find Random Game"}
                onPress={onRandomGame}
                disabled={!!busy.random}
              />
            </View>
          ) : (
            <FlatList
              data={games}
              scrollEnabled={false}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <GameCard
                  game={item}
                  myUserId={profile.id}
                  onPress={() => router.push(`/game/${item.id}`)}
                />
              )}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollPad: { paddingBottom: 24, paddingHorizontal: 14 },

  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 14,
    marginTop: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 3 },
    }),
  },

  h1: { fontSize: 20, fontWeight: "800" },
  h2: { fontSize: 16, fontWeight: "800" },
  sub: { marginTop: 4, fontWeight: "600" },
  empty: { paddingVertical: 8, fontWeight: "600" },

  actions: { paddingHorizontal: 14, gap: 10, marginTop: 10, paddingBottom: 4 },

  sectionHeader: { paddingHorizontal: 16, marginTop: 18, marginBottom: 8 },

  btn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondary: {},
  btnPressed: { transform: [{ scale: 0.99 }] },
  btnDisabled: { opacity: 0.55 },
  btnText: { fontSize: 16, fontWeight: "800" },

  inviteRow: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
    gap: 10,
  },
  input: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: "600",
  },
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
});
