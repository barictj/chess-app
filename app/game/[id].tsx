import React from "react";
import { View, Text, Button, Alert, Pressable } from "react-native";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import Constants from "expo-constants";
import { getToken } from "../../lib/token";
import { Chess } from "chess.js";
import { getUserIdFromToken } from "../../lib/auth";
import { resignGame, rematchGame } from "../../lib/api";
import { router } from "expo-router";
import Chessboard from "react-native-chessboard";

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL;

function makeRequestId() {
  return `m_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function GameScreen() {
  console.log("BACKEND_URL =", BACKEND_URL);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showCastleTip, setShowCastleTip] = React.useState(false);

  const [game, setGame] = React.useState<any>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [myColor, setMyColor] = React.useState<"w" | "b" | null>(null);
  const [lastMove, setLastMove] = React.useState<{
    from: string;
    to: string;
  } | null>(null);

  // Track what the board was BEFORE the user’s drag (for derive-move)
  const prevFenRef = React.useRef<string>("startpos");

  // Track last seen fen for polling change detection
  const lastSeenFenRef = React.useRef<string | null>(null);

  // Prevent double-sends if something weird happens
  const sendingRef = React.useRef(false);

  const loadGame = React.useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error("No token");

    const myId = getUserIdFromToken(token);
    if (!myId) throw new Error("Token missing sub");

    const res = await fetch(`${BACKEND_URL}/api/games/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const text = await res.text();
    if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

    const g = JSON.parse(text);
    console.log("Loaded game:", g);

    setGame(g);
    prevFenRef.current = g.fen ?? "startpos";
    lastSeenFenRef.current = g.fen ?? null;

    if (String(g.white_user_id) === myId) setMyColor("w");
    else if (String(g.black_user_id) === myId) setMyColor("b");
    else setMyColor(null);
  }, [id]);

  React.useEffect(() => {
    (async () => {
      try {
        setErr(null);
        await loadGame();
      } catch (e: any) {
        setErr(e?.message ?? String(e));
      }
    })();
  }, [loadGame]);

  async function sendMove(from: string, to: string, promotion?: string) {
    if (sendingRef.current) return;
    sendingRef.current = true;

    try {
      const token = await getToken();
      if (!token) throw new Error("No token");

      const res = await fetch(`${BACKEND_URL}/api/games/${id}/move`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          request_id: makeRequestId(),
          from,
          to,
          promotion,
        }),
      });

      const text = await res.text();
      console.log("sendMove response:", text);
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

      const data = JSON.parse(text);
      if (data.last_move_from && data.last_move_to) {
        setLastMove({ from: data.last_move_from, to: data.last_move_to });
      }

      setGame((g: any) => ({
        ...(g ?? {}),
        fen: data.fen,
        pgn: data.pgn,
        turn: data.turn,
        status: data.status,
        result: data.result,
        last_move_san: data.move?.san,
      }));

      // Keep refs in sync with server-accepted result
      if (data.fen) {
        prevFenRef.current = data.fen;
        lastSeenFenRef.current = data.fen;
      }
    } finally {
      sendingRef.current = false;
    }
  }

  function findMoveFromFenChange(prevFen: string, nextFen: string) {
    const chess = new Chess(prevFen === "startpos" ? undefined : prevFen);

    const moves = chess.moves({ verbose: true }) as any[];
    for (const m of moves) {
      const test = new Chess(prevFen === "startpos" ? undefined : prevFen);
      test.move(m);
      if (test.fen() === nextFen) {
        return {
          from: m.from as string,
          to: m.to as string,
          promotion: m.promotion as string | undefined,
        };
      }
    }
    return null;
  }

  async function resign() {
    Alert.alert("Resign game?", "Are you sure you want to resign?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Resign",
        style: "destructive",
        onPress: async () => {
          try {
            setErr(null);
            await resignGame(String(id));
            await loadGame();
          } catch (e: any) {
            setErr(e?.message ?? String(e));
          }
        },
      },
    ]);
  }
  async function rematch() {
    try {
      setErr(null);
      const newGame = await rematchGame(String(id));
      // Navigate to new game
      router.replace(`/game/${newGame.id}`);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  }
  // Poll while focused
  useFocusEffect(
    React.useCallback(() => {
      let alive = true;
      let timer: any = null;

      async function poll() {
        try {
          if (!alive) return;
          if (!id) return;
          if (!game) return;

          if (game.status && game.status !== "active") return;

          const token = await getToken();
          if (!token) return;

          const res = await fetch(`${BACKEND_URL}/api/games/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          const text = await res.text();
          if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

          const fresh = JSON.parse(text);
          if (fresh.last_move_from && fresh.last_move_to) {
            setLastMove({ from: fresh.last_move_from, to: fresh.last_move_to });
          }

          if (fresh?.fen && fresh.fen !== lastSeenFenRef.current) {
            console.log("Opponent move detected");

            lastSeenFenRef.current = fresh.fen;
            prevFenRef.current = fresh.fen;

            setGame((g: any) => {
              if (g?.fen === fresh.fen && g?.pgn === fresh.pgn) return g;
              return { ...(g ?? {}), ...fresh };
            });
          }
        } catch (e: any) {
          console.log("poll error:", e?.message ?? String(e));
        } finally {
          if (!alive) return;
          timer = setTimeout(poll, 5000);
        }
      }

      // init on focus
      lastSeenFenRef.current = game?.fen ?? null;
      timer = setTimeout(poll, 1500);

      return () => {
        alive = false;
        if (timer) clearTimeout(timer);
      };
    }, [id, game?.status]),
  );

  const isMyTurn =
    !!game &&
    !!myColor &&
    ((game.turn === "w" && myColor === "w") ||
      (game.turn === "b" && myColor === "b"));
  const opponentId = !game
    ? null
    : myColor === "w"
      ? game.black_user_id
      : myColor === "b"
        ? game.white_user_id
        : null;

  const opponentUsername = !game
    ? null
    : myColor === "w"
      ? game.black_username
      : myColor === "b"
        ? game.white_username
        : null;
  React.useEffect(() => {
    if (!game?.fen || !myColor) return;

    const chess = new Chess(game.fen === "startpos" ? undefined : game.fen);
    const kingSq = myColor === "w" ? "e1" : "e8";
    const moves = chess.moves({ square: kingSq, verbose: true }) as any[];

    const canCastle = moves.some(
      (m) => m.flags?.includes("k") || m.flags?.includes("q"),
    );

    if (canCastle) setShowCastleTip(true);
  }, [game?.fen, myColor]);
  console.log("Rendering game:", game);
  const isGameOver = game?.status === "completed";
  const winner = isGameOver ? game?.result : null;
  const rematchPromptedRef = React.useRef(false);

  React.useEffect(() => {
    if (!game) return;
    if (game.status !== "completed") return;
    if (rematchPromptedRef.current) return;

    rematchPromptedRef.current = true;
    Alert.alert("Game over", "Rematch?", [
      {
        text: "No",
        style: "cancel",
      },
      {
        text: "Yes",
        onPress: async () => {
          await rematch();
        },
      },
    ]);
  }, [game?.status]);

  return (
    <View style={{ padding: 12, gap: 10 }}>
      <Text style={{ fontSize: 18, fontWeight: "600" }}>Game {id}</Text>
      <Text>Opponent: {opponentUsername ?? "(unknown)"}</Text>

      {err ? <Text>Error: {err}</Text> : null}
      {!game ? <Text>Loading…</Text> : null}

      {game ? (
        <>
          <Text>
            You: {myColor ?? "(unknown)"} | Status: {game.status} | Turn:{" "}
            {game.turn} {isMyTurn ? "(your move)" : "(waiting)"}
          </Text>
          <Text>Last move: {game.last_move_san ?? "(none)"}</Text>
          {isGameOver && winner && (
            <>
              <Text style={{ fontSize: 18, fontWeight: "bold" }}>
                {winner === "draw"
                  ? "Draw"
                  : winner === myColor
                    ? "You won 🎉"
                    : "You lost 😔"}
              </Text>
            </>
          )}

          <View
            style={{
              position: "relative",
            }}
          >
            <Chessboard
              fen={game?.fen === "startpos" ? undefined : game?.fen}
              boardOrientation={myColor === "b" ? "black" : "white"}
              // orientation={myColor === "b" ? "black" : "white"}
              onMove={(move: any) => {
                if (!isMyTurn || isGameOver) return;
                // react-native-chessboard uses {from, to} (promotion may not exist)
                sendMove(String(move.from), String(move.to), move.promotion);
              }}
            />

            {(!isMyTurn || isGameOver) && (
              <Pressable
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              />
            )}
          </View>

          {!isGameOver && <Button title="Resign Game" onPress={resign} />}
          {showCastleTip && (
            <Text style={{ fontStyle: "italic" }}>
              Tip: To castle, drag the king.
            </Text>
          )}
        </>
      ) : null}
    </View>
  );
}
