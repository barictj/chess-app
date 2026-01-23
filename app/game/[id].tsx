import React from "react";
import { View, Text } from "react-native";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import Constants from "expo-constants";
import { getToken } from "../../lib/token";
import Chessboard from "react-native-chessboard";
import { Chess } from "chess.js";
import { getUserIdFromToken } from "../../lib/auth";
import type { ChessboardRef } from "react-native-chessboard";

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL;

function makeRequestId() {
  return `m_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

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

  const boardRef = React.useRef<ChessboardRef | null>(null);

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
  React.useEffect(() => {
    if (!game?.fen || !lastMove) return;

    // give the board a tick to mount/update
    const t = setTimeout(() => {
      boardRef.current?.highlight({ square: lastMove.from as any });
      boardRef.current?.highlight({ square: lastMove.to as any });
    }, 0);

    return () => clearTimeout(t);
  }, [game?.fen, lastMove]);

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
  React.useEffect(() => {
    if (!game?.fen) return;

    const fen = game.fen === "startpos" ? undefined : game.fen;

    // resetBoard updates pieces AND clears previous highlights
    const t = setTimeout(() => {
      boardRef.current?.resetBoard?.(fen as any);

      // re-apply last move highlight after reset
      if (lastMove) {
        boardRef.current?.highlight?.({ square: lastMove.from as any });
        boardRef.current?.highlight?.({ square: lastMove.to as any });
      }
    }, 0);

    return () => clearTimeout(t);
  }, [game?.fen, lastMove]);

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
          <Chessboard
            ref={boardRef}
            fen={game.fen === "startpos" ? undefined : game.fen}
            onMove={(info: any) => {
              if (!game || !myColor) return;

              const isMyTurn =
                (game.turn === "w" && myColor === "w") ||
                (game.turn === "b" && myColor === "b");
              if (!isMyTurn) return;

              const from = info?.move?.from;
              const to = info?.move?.to;
              const promotion = info?.move?.promotion;

              if (!from || !to) return;

              // optimistic highlight immediately for your move

              sendMove(
                String(from),
                String(to),
                promotion ? String(promotion) : undefined,
              ).catch((e) => setErr(String(e)));
            }}
          />
        </>
      ) : null}
    </View>
  );
}
