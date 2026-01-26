import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Image,
} from "react-native";
import { useTheme } from "../../../lib/ThemeContext";
import { getUserAvatarUrl } from "../../../lib/api";

type Props = {
  invite: any;
  inviteUsername: string;
  onAccept: () => void;
  onDeny: () => void;
};

export default function InviteCard({
  invite,
  inviteUsername,
  onAccept,
  onDeny,
}: Props) {
  const { theme } = useTheme();
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const inviterId =
    invite.white_user_id === invite.invited_user_id
      ? invite.black_user_id
      : invite.white_user_id;
  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const url = await getUserAvatarUrl(inviterId);
        if (alive) setAvatarUrl(url);
      } catch (e) {
        console.error("Failed to fetch avatar URL:", e);
      }
    })();

    return () => {
      alive = false;
    };
  }, [invite.from_user_id]);

  console.log("Avatar URL:", avatarUrl);
  console.log("[InviteCard] rendering invite", invite);
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <View style={styles.row}>
        <View
          style={[styles.avatar, { backgroundColor: "rgba(255,255,255,0.10)" }]}
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImage}
              onError={() => setAvatarUrl(null)} // fallback on bad URL
            />
          ) : (
            <Text style={{ color: theme.subtext, fontWeight: "900" }}>
              {inviteUsername?.[0]?.toUpperCase() ?? "?"}
            </Text>
          )}
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>
            {inviteUsername}
          </Text>
          <Text style={[styles.sub, { color: theme.subtext }]}>
            Game invite #{invite.id}
          </Text>
        </View>

        <Text style={[styles.chev, { color: theme.subtext }]}>›</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onDeny}
          style={({ pressed }) => [
            styles.btn,
            styles.btnSecondary,
            { backgroundColor: theme.card, borderColor: theme.border },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.btnText, { color: theme.text }]}>Deny</Text>
        </Pressable>

        <Pressable
          onPress={onAccept}
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: theme.primary, borderColor: theme.primary },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.btnText, { color: "#fff" }]}>Accept</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 2 },
    }),
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  title: { fontSize: 17, fontWeight: "900" },
  sub: { marginTop: 2, fontSize: 12, fontWeight: "800" },

  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  btnSecondary: {},
  btnText: { fontSize: 14, fontWeight: "900", letterSpacing: 0.2 },

  pressed: { transform: [{ scale: 0.99 }], opacity: 0.97 },
  chev: { marginLeft: 10, fontSize: 22, fontWeight: "900" },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
  },
});
