import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useTheme } from "../../../lib/ThemeContext";
import Chessboard from "dawikk-chessboard";
type Props = {
  game: any;
  myUserId: number;
  onPress: () => void;
};

function sinceShort(ts?: string) {
  if (!ts) return "—";
  const diffMs = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export default function GameCard({ game, myUserId, onPress }: Props) {
  const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  function normalizeFen(f: any) {
    if (typeof f !== "string") return START_FEN;
    const s = f.trim();
    if (!s) return START_FEN;
    if (s === "startpos" || s === "start") return START_FEN; // ✅ your case
    // super cheap “looks like fen” check: must have at least 4 space-separated fields
    if (s.split(" ").length < 4) return START_FEN;
    return s;
  }

  const fen = normalizeFen(game.fen ?? game.current_fen ?? game.position_fen);

  const myTurn = game.to_move_user_id === myUserId;

  const opponent = game.opponent_username ?? "—";
  const status = (game.status ?? "").toUpperCase();
  const last = sinceShort(game.last_move_at);

  const { theme, boardTheme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
        pressed && styles.pressed,
        myTurn && { borderColor: "rgba(47,107,255,0.45)" },
      ]}
    >
      {/* LEFT: mini chessboard */}

      <View style={styles.miniBoard}>
        <Chessboard
          fen={fen}
          boardTheme={boardTheme}
          readonly
          showCoordinates={false}
          showArrows={false}
          perspective={myTurn ? "white" : "black"}
          onMove={() => {}}
          highlightedSquares={[
            {
              square: game.last_move_from,
              color: "rgba(255,215,0,0.45)",
            },
            {
              square: game.last_move_to,
              color: "rgba(255,215,0,0.45)",
            },
          ].filter((x) => x.square)}
          lastMoveFrom={game.last_move_from ?? undefined}
          lastMoveTo={game.last_move_to ?? undefined}
        />
      </View>

      {/* MIDDLE: opponent + meta */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.topRow}>
          <Text
            numberOfLines={1}
            style={[styles.opponent, { color: theme.text }]}
          >
            {opponent}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "800" }}>
            Record: {game.opponent_stats?.stats?.wins ?? 0}-
            {game.opponent_stats?.stats?.losses ?? 0}-
            {game.opponent_stats?.stats?.draws ?? 0}D
          </Text>
        </View>

        <View style={styles.bottomRow}>
          {myTurn ? (
            <View style={[styles.pill, styles.pillTurn]}>
              <Text style={styles.pillText}>YOUR TURN</Text>
            </View>
          ) : (
            <View style={[{ borderColor: theme.border }]}>
              <Text style={[styles.pillText, { color: theme.subtext }]}>
                Waiting on opponent
              </Text>
            </View>
          )}
        </View>
        <View style={{ marginTop: 12 }}>
          <Text style={[styles.time, { color: theme.subtext }]}>{last}</Text>
        </View>
      </View>

      {/* RIGHT: chevron */}
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
        }}
      >
        <Text style={[styles.chev, { color: theme.subtext }]}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingVertical: 0,
    paddingHorizontal: 0,
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 16,
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
  pressed: { transform: [{ scale: 0.995 }], opacity: 0.98 },

  miniBoard: {
    width: 150,
    height: 150,
    borderRadius: 14,
    overflow: "hidden",
    marginRight: 2,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 2,
    marginTop: 18,
    marginBottom: 10,
  },
  opponent: { fontSize: 15, fontWeight: "900" },
  time: { fontSize: 15, fontWeight: "800" },

  bottomRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: 10,
  },

  pill: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 999,
    borderWidth: 1,

    alignItems: "center", // 👈 horizontal
    justifyContent: "center", // 👈 vertical
  },

  pillTurn: {
    backgroundColor: "#2F6BFF",
    borderColor: "#2F6BFF",
  },
  pillText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.3,
    color: "#fff",
    textAlign: "center",
  },

  sub: { flex: 1, fontSize: 12, fontWeight: "800" },
  chev: { marginLeft: 10, fontSize: 25, fontWeight: "900", marginRight: 0 },
});
