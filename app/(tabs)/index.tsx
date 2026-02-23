import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  Image,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";

import {
  createGame,
  findRandomGame,
  getUserProfile,
  playAgainstBot,
  getGameInvites,
  acceptInvitedGame,
  denyInvitedGame,
  getActiveGames,
  getUserStats,
  GameCreateOptions,
} from "../../lib/api";

import InviteCard from "../compononents/Home/InviteCard";
import GameCard from "../compononents/Home/GameCard";
import { useTheme } from "../../lib/ThemeContext";
import { LoadState, msg } from "../../lib/loadState";
import ErrorBanner, { SkeletonRow } from "../compononents/Shared/States";
import { maybeShowInterstitial, preloadInterstitial } from "../../lib/ads";

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

function opponentId(row: any, myId?: number) {
  if (!myId) return null;

  const w = row.white_user_id ?? null;
  const b = row.black_user_id ?? null;
  const invited = row.invited_user_id ?? null;

  if (w && w === myId) return b;
  if (b && b === myId) return w;
  if (invited && invited === myId) return w ?? b;
  if (invited && invited !== myId) return invited;
  if (w && w !== myId) return w;
  if (b && b !== myId) return b;

  return null;
}

export default function Lobby() {
  const { theme } = useTheme();

  const IOS_UNIT_ID = "ca-app-pub-7166427778546018/2888339328";
  const ANDROID_UNIT_ID = "ca-app-pub-7166427778546018/1223612286";
  const BANNER_UNIT_ID = Platform.OS === "ios" ? IOS_UNIT_ID : ANDROID_UNIT_ID;
  const TABBAR_HEIGHT = 56;
  const BANNER_HEIGHT = 50;
  const BOTTOM_RESERVE = BANNER_HEIGHT + TABBAR_HEIGHT + 18;

  function minsSince(ts?: string) {
    if (!ts) return Infinity;
    return Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  }

  function withOpponentUsername(game: any, profile: any) {
    if (!profile) return game;
    const opponentUsername =
      game.white_user_id === profile.id ? game.black_username : game.white_username;
    return { ...game, opponent_username: opponentUsername };
  }

  function getOpponentUsername(row: any, profile: any) {
    const myId = profile?.id;
    if (!myId) return "--";

    if (row.white_user_id === myId) return row.black_username ?? "--";
    if (row.black_user_id === myId) return row.white_username ?? "--";

    if (row.invited_user_id === myId) {
      if (row.white_user_id && row.white_user_id !== myId) return row.white_username ?? "--";
      if (row.black_user_id && row.black_user_id !== myId) return row.black_username ?? "--";
      return row.white_username ?? row.black_username ?? "--";
    }

    return "--";
  }

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

  const [myStatsS, setMyStatsS] = useState<LoadState<any>>({
    status: "loading",
    data: null,
    error: null,
  });

  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<"casual" | "ranked">("ranked");
  const [timeControl, setTimeControl] = useState<
    "bullet" | "blitz" | "rapid" | "daily"
  >("daily");

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

      if (prof?.id) {
        try {
          setMyStatsS((s) => ({ ...s, status: "loading", error: null }));
          const mine = await getUserStats(prof.id);
          setMyStatsS({ status: "ready", data: mine, error: null });
        } catch (e) {
          setMyStatsS({ status: "error", data: null, error: msg(e) });
        }
      } else {
        setMyStatsS({ status: "empty", data: null, error: null });
      }

      const ids = new Set<number>();
      if (prof?.id) {
        games.forEach((g: any) => {
          const id = opponentId(g, prof.id);
          if (typeof id === "number") ids.add(id);
        });
        inv.forEach((i: any) => {
          const id = opponentId(i, prof.id);
          if (typeof id === "number") ids.add(id);
        });
      }

      const statsMap: Record<number, any> = {};
      await Promise.all(
        [...ids].map(async (id) => {
          try {
            statsMap[id] = await getUserStats(id);
          } catch {
            // Ignore per-user stats failures so the page remains usable.
          }
        }),
      );

      const inv2 = prof?.id
        ? inv.map((i: any) => {
            const oid = opponentId(i, prof.id);
            return { ...i, opponent_stats: oid ? statsMap[oid] : null };
          })
        : inv;

      const games2 = prof?.id
        ? games.map((g: any) => {
            const oid = opponentId(g, prof.id);
            return { ...g, opponent_stats: oid ? statsMap[oid] : null };
          })
        : games;

      const enriched = prof ? games2.map((g: any) => withOpponentUsername(g, prof)) : games2;

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
        status: inv2.length ? "ready" : "empty",
        data: inv2,
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
  const isPaidSubscriber = !!profile?.paid_subscriber;
  const invites = invitesS.data ?? [];
  const games = gamesS.data ?? [];

  const inviteName = username.trim();
  const canInvite = inviteName.length >= 2 && !busy.inviteUser;

  const myRecordText = useMemo(() => {
    return `W:${myStatsS.data?.stats?.wins ?? 0}  L:${myStatsS.data?.stats?.losses ?? 0}  D:${myStatsS.data?.stats?.draws ?? 0}`;
  }, [myStatsS.data]);

  const queueOptions = useMemo<GameCreateOptions>(() => {
    const byTc: Record<
      "bullet" | "blitz" | "rapid" | "daily",
      { initial: number | null; increment: number | null }
    > = {
      bullet: { initial: 60_000, increment: 0 },
      blitz: { initial: 300_000, increment: 2_000 },
      rapid: { initial: 600_000, increment: 5_000 },
      daily: { initial: null, increment: 0 },
    };
    const tc = byTc[timeControl];
    return {
      game_mode: mode,
      time_control: timeControl,
      initial_time_ms: tc.initial,
      increment_ms: tc.increment,
    };
  }, [mode, timeControl]);

  React.useEffect(() => {
    preloadInterstitial(isPaidSubscriber);
  }, [isPaidSubscriber]);

  async function onRefresh() {
    try {
      setRefreshing(true);
      await loadAll();
    } finally {
      setRefreshing(false);
    }
  }

  async function onRandomGame() {
    try {
      setBusy((b) => ({ ...b, random: true }));
      const game = await findRandomGame(queueOptions);
      await maybeShowInterstitial(isPaidSubscriber);
      router.push(`/game/${game.id}`);
    } catch (e) {
      setGamesS((s) => ({ status: "error", data: s.data, error: msg(e) }) as any);
    } finally {
      setBusy((b) => ({ ...b, random: false }));
    }
  }

  async function onInvite() {
    if (!inviteName) return;

    try {
      setBusy((b) => ({ ...b, inviteUser: true }));
      const game = await createGame(inviteName, queueOptions);
      setUsername("");
      await maybeShowInterstitial(isPaidSubscriber);
      router.push(`/game/${game.id}`);
    } catch (e) {
      setInvitesS((s) => ({ status: "error", data: s.data, error: msg(e) }) as any);
    } finally {
      setBusy((b) => ({ ...b, inviteUser: false }));
    }
  }

  async function onPlayBot() {
    try {
      setBusy((b) => ({ ...b, bot: true }));
      const game = await playAgainstBot({
        ...queueOptions,
        game_mode: "casual",
      });
      await maybeShowInterstitial(isPaidSubscriber);
      router.push(`/game/${game.id}`);
    } catch (e) {
      setGamesS((s) => ({ status: "error", data: s.data, error: msg(e) }) as any);
    } finally {
      setBusy((b) => ({ ...b, bot: false }));
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["left", "right"]}>
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={[styles.scrollPad, { paddingBottom: BOTTOM_RESERVE }]}
        >
          <View style={[styles.hero, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {profileS.status === "loading" ? (
              <Text style={[styles.h1, { color: theme.text }]}>Loading...</Text>
            ) : profileS.status === "error" ? (
              <ErrorBanner text={profileS.error} onRetry={loadAll} />
            ) : (
              <>
                <View style={styles.heroTopRow}>
                  {profile?.avatar_url ? (
                    <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
                  ) : (
                    <View style={styles.avatarWrap}>
                      <Text style={{ color: theme.subtext, fontWeight: "900", fontSize: 22 }}>
                        {(profile?.username?.[0] ?? "?").toUpperCase()}
                      </Text>
                    </View>
                  )}

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.h1, { color: theme.text }]}>@{profile.username}</Text>
                    <Text style={[styles.sub, { color: theme.subtext }]}>Rating: {profile.rating}</Text>
                <Text style={[styles.sub, { color: theme.subtext }]}>{myRecordText}</Text>
                {!isPaidSubscriber ? (
                  <Text style={[styles.sub, { color: theme.subtext }]}>
                    No ads for paid subscribers coming soon.
                  </Text>
                ) : (
                  <Text style={[styles.sub, { color: theme.primary, fontWeight: "800" }]}>
                    Ad-free subscription active.
                  </Text>
                )}
              </View>
            </View>

                <View style={styles.heroStatsRow}>
                  <View style={[styles.statPill, { borderColor: theme.border }]}> 
                    <Text style={[styles.statLabel, { color: theme.subtext }]}>Active</Text>
                    <Text style={[styles.statValue, { color: theme.text }]}>{games.length}</Text>
                  </View>
                  <View style={[styles.statPill, { borderColor: theme.border }]}> 
                    <Text style={[styles.statLabel, { color: theme.subtext }]}>Invites</Text>
                    <Text style={[styles.statValue, { color: theme.text }]}>{invites.length}</Text>
                  </View>
                  <View style={[styles.statPill, { borderColor: theme.border }]}> 
                    <Text style={[styles.statLabel, { color: theme.subtext }]}>Turn Up</Text>
                    <Text style={[styles.statValue, { color: theme.text }]}>
                      {games.filter((g) => g.to_move_user_id === profile?.id).length}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>

          <View style={styles.actions}>
            <View style={styles.queueCard}>
              <Text style={[styles.queueLabel, { color: theme.subtext }]}>
                Queue Settings
              </Text>

              <View style={styles.toggleRow}>
                <Pressable
                  onPress={() => setMode("ranked")}
                  style={[
                    styles.toggleBtn,
                    {
                      backgroundColor:
                        mode === "ranked" ? theme.primary : theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: mode === "ranked" ? "#fff" : theme.text,
                      fontWeight: "800",
                    }}
                  >
                    Ranked
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setMode("casual")}
                  style={[
                    styles.toggleBtn,
                    {
                      backgroundColor:
                        mode === "casual" ? theme.primary : theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: mode === "casual" ? "#fff" : theme.text,
                      fontWeight: "800",
                    }}
                  >
                    Casual
                  </Text>
                </Pressable>
              </View>

              <View style={styles.toggleRowWrap}>
                {(["bullet", "blitz", "rapid", "daily"] as const).map((tc) => (
                  <Pressable
                    key={tc}
                    onPress={() => setTimeControl(tc)}
                    style={[
                      styles.toggleBtnSmall,
                      {
                        backgroundColor:
                          timeControl === tc ? theme.primary : theme.card,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: timeControl === tc ? "#fff" : theme.text,
                        fontWeight: "800",
                        textTransform: "capitalize",
                      }}
                    >
                      {tc}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

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

          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.h2, { color: theme.text }]}>Challenge by Username</Text>
            <Text style={[styles.sub, { color: theme.subtext }]}>Send a direct game invite to a friend.</Text>
            <View style={styles.inviteComposerRow}>
              <TextInput
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Enter username"
                placeholderTextColor={theme.subtext}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.bg,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
              />
              <Pressable
                onPress={onInvite}
                disabled={!canInvite}
                style={({ pressed }) => [
                  styles.inviteSubmit,
                  { backgroundColor: theme.primary, borderColor: theme.primary },
                  (!canInvite || pressed) && styles.inviteSubmitDisabled,
                ]}
              >
                <Text style={styles.inviteSubmitText}>{busy.inviteUser ? "Sending..." : "Invite"}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.h2, { color: theme.text }]}>Game Invites ({invites.length})</Text>
          </View>

          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}> 
            {invitesS.status === "loading" ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : invitesS.status === "error" ? (
              <ErrorBanner text={invitesS.error} onRetry={loadAll} />
            ) : invitesS.status === "empty" ? (
              <Text style={[styles.empty, { color: theme.subtext }]}>No game invites</Text>
            ) : (
              <FlatList
                data={invites}
                scrollEnabled={false}
                keyExtractor={(item) => `invite-${item.id}`}
                renderItem={({ item }) => (
                  <InviteCard
                    invite={item}
                    inviteUsername={getOpponentUsername(item, profile)}
                    accepting={busy.acceptId === String(item.id)}
                    denying={busy.denyId === String(item.id)}
                    onAccept={async () => {
                      try {
                        setBusy((b) => ({ ...b, acceptId: String(item.id) }));
                        await acceptInvitedGame(String(item.id));
                        await loadAll();
                        await maybeShowInterstitial(isPaidSubscriber);
                        router.push(`/game/${item.id}`);
                      } catch (e) {
                        setInvitesS((s) => ({ status: "error", data: s.data, error: msg(e) }) as any);
                      } finally {
                        setBusy((b) => ({ ...b, acceptId: undefined }));
                      }
                    }}
                    onDeny={async () => {
                      try {
                        setBusy((b) => ({ ...b, denyId: String(item.id) }));
                        await denyInvitedGame(String(item.id));
                        await loadAll();
                      } catch (e) {
                        setInvitesS((s) => ({ status: "error", data: s.data, error: msg(e) }) as any);
                      } finally {
                        setBusy((b) => ({ ...b, denyId: undefined }));
                      }
                    }}
                  />
                )}
              />
            )}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.h2, { color: theme.text }]}>Active Games ({games.length})</Text>
          </View>

          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}> 
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
                <Text style={[styles.empty, { color: theme.subtext }]}>No active games</Text>
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

      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: TABBAR_HEIGHT,
          height: BANNER_HEIGHT,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.bg,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.border,
        }}
      >
        {!isPaidSubscriber ? (
          <BannerAd unitId={BANNER_UNIT_ID} size={BannerAdSize.BANNER} />
        ) : (
          <Text style={{ color: theme.subtext, fontWeight: "700" }}>
            Ads disabled for your subscription.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollPad: { paddingBottom: 24, paddingHorizontal: 6 },

  hero: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginHorizontal: 14,
    marginTop: 4,
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

  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  heroStatsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },

  statPill: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },

  statLabel: {
    fontSize: 11,
    fontWeight: "700",
  },

  statValue: {
    marginTop: 3,
    fontSize: 16,
    fontWeight: "900",
  },

  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 14,
    marginTop: 0,
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

  actions: { paddingHorizontal: 14, gap: 10, marginTop: 10, paddingBottom: 8 },
  queueCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderColor: "rgba(0,0,0,0.08)",
  },
  queueLabel: {
    fontSize: 12,
    fontWeight: "800",
  },
  toggleRow: {
    flexDirection: "row",
    gap: 8,
  },
  toggleRowWrap: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  toggleBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBtnSmall: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
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

  input: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: "600",
  },

  inviteComposerRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  inviteSubmit: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    minWidth: 88,
    alignItems: "center",
    justifyContent: "center",
  },

  inviteSubmitDisabled: {
    opacity: 0.6,
  },

  inviteSubmitText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
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

  avatarImg: {
    width: 72,
    height: 72,
    borderRadius: 22,
  },
});
