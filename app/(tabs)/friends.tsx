import React from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Image,
} from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect, router } from "expo-router";
import { useTheme } from "../../lib/ThemeContext";

import {
  getFriendsList,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  requestFriend,
  acceptFriendRequest,
  denyFriendRequest,
  createInvitedGame,
  getUserAvatarUrl,
} from "../../lib/api";

import { confirm as confirmDialog } from "../compononents/Shared/Confirm";
import { LoadState, msg } from "../../lib/loadState";
import { ErrorBanner, SkeletonRow } from "../compononents/Shared/States";

type Friend = { username: string };

type Incoming = {
  id: number;
  from_user_id: number;
  from_username: string;
  to_username?: string;
};

type Outgoing = {
  id: number;
  to_user_id: number;
  to_username: string;
  created_at: string;
};

function CwfButton({
  title,
  onPress,
  disabled,
  theme,
  variant = "primary",
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  theme: any;
  variant?: "primary" | "secondary" | "danger";
}) {
  const bg =
    variant === "primary"
      ? theme.primary
      : variant === "danger"
        ? "#E5484D"
        : theme.card;

  const border = variant === "secondary" ? theme.border : bg;
  const textColor = variant === "secondary" ? theme.text : "#fff";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderColor: border },
        disabled && { opacity: 0.55 },
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.btnText, { color: textColor }]}>{title}</Text>
    </Pressable>
  );
}

function Section({ title, children, theme }: any) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

function Row({
  left,
  right,
  theme,
  last,
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
  theme: any;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.row,
        !last && { borderBottomWidth: 1, borderBottomColor: theme.border },
      ]}
    >
      <View style={{ flex: 1, minWidth: 0 }}>{left}</View>
      {right ? <View style={{ marginLeft: 10 }}>{right}</View> : null}
    </View>
  );
}

function UserAvatar({
  url,
  fallbackLetter,
  theme,
  size = 64,
}: {
  url?: string | null;
  fallbackLetter: string;
  theme: any;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = !!url && !failed;

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: 12,
          backgroundColor: "rgba(255,255,255,0.10)",
          marginRight: 10,
          borderColor: theme.border,
        },
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: url! }}
          style={{ width: "100%", height: "100%", borderRadius: 12 }}
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={{ color: theme.subtext, fontWeight: "900" }}>
          {fallbackLetter}
        </Text>
      )}
    </View>
  );
}

export default function FriendsScreen() {
  const { theme } = useTheme();
  const [possibleFriend, setPossibleFriend] = useState("");

  const [friendsS, setFriendsS] = useState<LoadState<Friend[]>>({
    status: "loading",
    data: null,
    error: null,
  });
  const [incomingS, setIncomingS] = useState<LoadState<Incoming[]>>({
    status: "loading",
    data: null,
    error: null,
  });
  const [outgoingS, setOutgoingS] = useState<LoadState<Outgoing[]>>({
    status: "loading",
    data: null,
    error: null,
  });

  // avatar cache: userId -> url (or null if none/failed)
  const [avatarByUserId, setAvatarByUserId] = useState<
    Record<number, string | null>
  >({});

  const [busy, setBusy] = useState<{
    add?: boolean;
    acceptId?: number;
    denyId?: number;
    gameWith?: string;
  }>({});

  const loadAll = useCallback(async () => {
    setFriendsS((s) => ({ ...s, status: "loading", error: null }));
    setIncomingS((s) => ({ ...s, status: "loading", error: null }));
    setOutgoingS((s) => ({ ...s, status: "loading", error: null }));

    try {
      const [f, i, o] = await Promise.all([
        getFriendsList(),
        getIncomingFriendRequests(),
        getOutgoingFriendRequests(),
      ]);

      setFriendsS({
        status: f.length ? "ready" : "empty",
        data: f,
        error: null,
      });
      setIncomingS({
        status: i.length ? "ready" : "empty",
        data: i,
        error: null,
      });
      setOutgoingS({
        status: o.length ? "ready" : "empty",
        data: o,
        error: null,
      });
    } catch (e) {
      const m = msg(e);
      setFriendsS((s) => ({ status: "error", data: s.data, error: m }) as any);
      setIncomingS((s) => ({ status: "error", data: s.data, error: m }) as any);
      setOutgoingS((s) => ({ status: "error", data: s.data, error: m }) as any);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll]),
  );

  const friends = friendsS.data ?? [];
  const incoming = incomingS.data ?? [];
  const outgoing = outgoingS.data ?? [];

  // Collect user IDs we need avatars for:
  // - incoming: from_user_id
  // - outgoing: to_user_id
  const neededAvatarIds = useMemo(() => {
    const ids = new Set<number>();
    for (const r of incoming) ids.add(r.from_user_id);
    for (const r of outgoing) ids.add(r.to_user_id);
    return Array.from(ids);
  }, [incoming, outgoing]);

  // Fetch avatars (cached; only fetch missing ones)
  useEffect(() => {
    let alive = true;

    (async () => {
      const missing = neededAvatarIds.filter(
        (id) => avatarByUserId[id] === undefined,
      );
      if (!missing.length) return;

      for (const id of missing) {
        try {
          const url = await getUserAvatarUrl(id); // returns string (or throws)
          if (!alive) return;
          setAvatarByUserId((m) => ({ ...m, [id]: url ?? null }));
        } catch (e) {
          if (!alive) return;
          // cache failure as null so we don't spam fetches
          setAvatarByUserId((m) => ({ ...m, [id]: null }));
          console.error("Failed to fetch avatar URL:", e);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [neededAvatarIds, avatarByUserId]);

  const onAdd = useCallback(async () => {
    const u = possibleFriend.trim();
    if (!u) return;
    try {
      setBusy((b) => ({ ...b, add: true }));
      await requestFriend(u);
      setPossibleFriend("");
      await loadAll();
    } catch (e) {
      setFriendsS(
        (s) => ({ status: "error", data: s.data, error: msg(e) }) as any,
      );
    } finally {
      setBusy((b) => ({ ...b, add: false }));
    }
  }, [possibleFriend, loadAll]);

  async function acceptRequestButton(from_user_id: number) {
    try {
      setBusy((b) => ({ ...b, acceptId: from_user_id }));
      await acceptFriendRequest(from_user_id);
      await loadAll();
    } catch (e) {
      setIncomingS(
        (s) => ({ status: "error", data: s.data, error: msg(e) }) as any,
      );
    } finally {
      setBusy((b) => ({ ...b, acceptId: undefined }));
    }
  }

  async function denyFriendRequestButton(from_user_id: number) {
    try {
      setBusy((b) => ({ ...b, denyId: from_user_id }));
      await denyFriendRequest(from_user_id);
      await loadAll();
    } catch (e) {
      setIncomingS(
        (s) => ({ status: "error", data: s.data, error: msg(e) }) as any,
      );
    } finally {
      setBusy((b) => ({ ...b, denyId: undefined }));
    }
  }

  async function createGameWithFriend(friendUsername: string) {
    try {
      setBusy((b) => ({ ...b, gameWith: friendUsername }));
      const game = await createInvitedGame(friendUsername);
      router.push(`/game/${game.id}`);
    } catch (e) {
      setFriendsS(
        (s) => ({ status: "error", data: s.data, error: msg(e) }) as any,
      );
    } finally {
      setBusy((b) => ({ ...b, gameWith: undefined }));
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: 14, paddingBottom: 28 }}
    >
      {friendsS.status === "error" ? (
        <ErrorBanner text={friendsS.error} onRetry={loadAll} />
      ) : null}

      {/* Add friend */}
      <Section title="Add Friend" theme={theme}>
        <View style={[styles.addRow, { borderColor: theme.border }]}>
          <TextInput
            placeholder="Username"
            placeholderTextColor={theme.subtext}
            value={possibleFriend}
            onChangeText={setPossibleFriend}
            autoCapitalize="none"
            style={[styles.input, { color: theme.text }]}
          />
          <CwfButton
            theme={theme}
            title={busy.add ? "Adding…" : "Add"}
            onPress={onAdd}
            disabled={!!busy.add || !possibleFriend.trim()}
          />
        </View>
      </Section>

      {/* Incoming */}
      <Section title="Incoming Requests" theme={theme}>
        {incomingS.status === "loading" ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : incomingS.status === "error" ? (
          <ErrorBanner text={incomingS.error} onRetry={loadAll} />
        ) : incomingS.status === "empty" ? (
          <Text style={[styles.empty, { color: theme.subtext }]}>
            No incoming requests
          </Text>
        ) : (
          incoming.map((r, idx) => (
            <Row
              key={r.id ?? r.from_user_id}
              theme={theme}
              last={idx === incoming.length - 1}
              left={
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <UserAvatar
                    theme={theme}
                    url={avatarByUserId[r.from_user_id]}
                    fallbackLetter={
                      (r.from_username?.[0]?.toUpperCase() ?? "?") as string
                    }
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[styles.rowTitle, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {r.from_username}
                    </Text>
                    <Text style={[styles.rowSub, { color: theme.subtext }]}>
                      sent you a friend request
                    </Text>
                  </View>
                </View>
              }
              right={
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <CwfButton
                    theme={theme}
                    variant="secondary"
                    title={busy.denyId === r.from_user_id ? "…" : "Deny"}
                    disabled={
                      busy.denyId === r.from_user_id ||
                      busy.acceptId === r.from_user_id
                    }
                    onPress={async () => {
                      const ok = await confirmDialog({
                        title: "Deny friend request",
                        message: `Deny friend request from ${r.from_username}?`,
                        confirmText: "Deny",
                        destructive: true,
                      });
                      if (ok) await denyFriendRequestButton(r.from_user_id);
                    }}
                  />
                  <CwfButton
                    theme={theme}
                    title={busy.acceptId === r.from_user_id ? "…" : "Accept"}
                    disabled={
                      busy.acceptId === r.from_user_id ||
                      busy.denyId === r.from_user_id
                    }
                    onPress={async () => {
                      const ok = await confirmDialog({
                        title: "Accept friend request",
                        message: `Accept friend request from ${r.from_username}?`,
                        confirmText: "Accept",
                      });
                      if (ok) await acceptRequestButton(r.from_user_id);
                    }}
                  />
                </View>
              }
            />
          ))
        )}
      </Section>

      {/* Outgoing */}
      <Section title="Outgoing Requests" theme={theme}>
        {outgoingS.status === "loading" ? (
          <SkeletonRow />
        ) : outgoingS.status === "error" ? (
          <ErrorBanner text={outgoingS.error} onRetry={loadAll} />
        ) : outgoingS.status === "empty" ? (
          <Text style={[styles.empty, { color: theme.subtext }]}>
            No outgoing requests
          </Text>
        ) : (
          outgoing.map((r, idx) => (
            <Row
              key={r.id ?? `${r.to_user_id}-${idx}`}
              theme={theme}
              last={idx === outgoing.length - 1}
              left={
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <UserAvatar
                    theme={theme}
                    url={avatarByUserId[r.to_user_id]}
                    fallbackLetter={
                      (r.to_username?.[0]?.toUpperCase() ?? "?") as string
                    }
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[styles.rowTitle, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {r.to_username}
                    </Text>
                    <Text style={[styles.rowSub, { color: theme.subtext }]}>
                      pending acceptance
                    </Text>
                  </View>
                </View>
              }
            />
          ))
        )}
      </Section>

      {/* Friends */}
      <Section title="Friends" theme={theme}>
        {friendsS.status === "loading" ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : friendsS.status === "empty" ? (
          <Text style={[styles.empty, { color: theme.subtext }]}>
            No friends yet
          </Text>
        ) : (
          friends.map((f, idx) => (
            <Row
              key={f.username}
              theme={theme}
              last={idx === friends.length - 1}
              left={
                <Text style={[styles.rowTitle, { color: theme.text }]}>
                  {f.username}
                </Text>
              }
              right={
                <CwfButton
                  theme={theme}
                  variant="primary"
                  title={busy.gameWith === f.username ? "Creating…" : "Play"}
                  disabled={busy.gameWith === f.username}
                  onPress={() => createGameWithFriend(f.username)}
                />
              }
            />
          ))
        )}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 2 },
    }),
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  empty: { paddingVertical: 8, fontWeight: "700" },

  addRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    fontSize: 16,
    fontWeight: "700",
  },

  row: {
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  rowTitle: { fontSize: 16, fontWeight: "900" },
  rowSub: { marginTop: 2, fontSize: 12, fontWeight: "800" },

  avatar: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  btn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 86,
  },
  btnText: { fontSize: 13, fontWeight: "900", letterSpacing: 0.2 },
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.97 },
});
