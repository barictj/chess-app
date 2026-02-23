import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import Chessboard from "dawikk-chessboard";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../lib/ThemeContext";

type Props = {
  game: any;
  myUserId: number;
  onPress: () => void;
};

function sinceShort(ts?: string) {
  if (!ts) return "--";
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
    if (s === "startpos" || s === "start") return START_FEN;
    if (s.split(" ").length < 4) return START_FEN;
    return s;
  }

  const fen = normalizeFen(game.fen ?? game.current_fen ?? game.position_fen);
  const myTurn = game.to_move_user_id === myUserId;
  const iAmWhite = game.white_user_id === myUserId;

  const opponent = game.opponent_username ?? "--";
  const last = sinceShort(game.last_move_at ?? game.created_at);

  const { theme, boardTheme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: myTurn ? "rgba(47,107,255,0.45)" : theme.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.miniBoard}>
        <Chessboard
          fen={fen}
          boardTheme={boardTheme}
          readonly
          showCoordinates={false}
          showArrows={false}
          perspective={iAmWhite ? "white" : "black"}
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

      <View style={{ flex: 1, minWidth: 0, paddingVertical: 10 }}>
        <View style={styles.topRow}>
          <Text numberOfLines={1} style={[styles.opponent, { color: theme.text }]}>
            {opponent}
          </Text>
          <Text style={[styles.time, { color: theme.subtext }]}>{last}</Text>
        </View>

        <Text style={[styles.record, { color: theme.subtext }]}>
          Record: {game.opponent_stats?.stats?.wins ?? 0}W/
          {game.opponent_stats?.stats?.losses ?? 0}L/
          {game.opponent_stats?.stats?.draws ?? 0}D
        </Text>

        <View style={styles.bottomRow}>
          {myTurn ? (
            <View style={[styles.pill, styles.pillTurn]}>
              <Text style={styles.pillText}>YOUR TURN</Text>
            </View>
          ) : (
            <View style={[styles.pill, { borderColor: theme.border }]}>
              <Text style={[styles.pillText, { color: theme.subtext }]}>Waiting</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.chevWrap}>
        <Ionicons name="chevron-forward" size={18} color={theme.subtext} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "stretch",
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
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
    width: 124,
    height: 124,
    overflow: "hidden",
  },

  topRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 10,
  },

  opponent: { fontSize: 15, fontWeight: "900", flex: 1 },
  time: { fontSize: 12, fontWeight: "800" },
  record: { fontSize: 12, fontWeight: "700", paddingHorizontal: 10 },

  bottomRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },

  pill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  pillTurn: {
    backgroundColor: "#2F6BFF",
    borderColor: "#2F6BFF",
  },

  pillText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.3,
    color: "#fff",
    textAlign: "center",
  },

  chevWrap: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
});
