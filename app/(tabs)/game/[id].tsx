import React from "react";
import {
  View,
  Text,
  Alert,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import { router } from "expo-router";
import Constants from "expo-constants";
import { Chess } from "chess.js";
import { useTheme } from "../../../lib/ThemeContext";
import { getToken } from "../../../lib/token";
import { getUserIdFromToken } from "../../../lib/auth";
import {
  resignGame,
  rematchGame,
  offerDraw,
  respondToDrawOffer,
  claimDraw,
  type DrawClaimReason,
  getFriendsList,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  getUserProfile,
  requestFriend,
  acceptFriendRequest,
  denyFriendRequest,
} from "../../../lib/api";

import Chessboard from "dawikk-chessboard";
import { confirm } from "../../compononents/Shared/Confirm";
import { msg } from "../../../lib/loadState";
import type { LoadState } from "../../../lib/loadState";

import ErrorBanner, { SkeletonRow } from "../../compononents/Shared/States";
import { BACKEND_URL } from "../../../lib/config";
import StatusModal from "../../compononents/Shared/StatusModal";
import { maybeShowInterstitial, preloadInterstitial } from "../../../lib/ads";

function makeRequestId() {
  return `m_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, boardTheme } = useTheme();

  const [showCastleTip, setShowCastleTip] = React.useState(false);
  const [showDrawModal, setShowDrawModal] = React.useState(false);
  const [showClaimModal, setShowClaimModal] = React.useState(false);
  const [showRematch, setShowRematch] = React.useState(false);

  const [myColor, setMyColor] = React.useState<"w" | "b" | null>(null);
  const [lastMove, setLastMove] = React.useState<{
    from: string;
    to: string;
  } | null>(null);

  // ---- LoadState (single source of truth for loading/error)
  const [gameS, setGameS] = React.useState<LoadState<any>>({
    status: "loading",
    data: null,
    error: null,
  });
  const game = gameS.data;

  // ---- refs you already had
  const prevFenRef = React.useRef<string>("startpos");
  const promoPendingRef = React.useRef(false);
  const lastSeenFenRef = React.useRef<string | null>(null);
  const sendingRef = React.useRef(false);
  const rematchPromptedRef = React.useRef(false);

  // ✅ CHECK / CHECKMATE MODAL (keep near top so it's defined before hooks that use it)
  const [statusMsg, setStatusMsg] = React.useState<string | null>(null);
  const lastStatusRef = React.useRef<"none" | "check" | "checkmate">("none");
  const [clockTick, setClockTick] = React.useState(0);
  const [isPaidSubscriber, setIsPaidSubscriber] = React.useState(false);

  function maybeShowCheckModal(fen: string) {
    try {
      const chess = new Chess(fen);

      const isMate =
        (chess as any).isCheckmate?.() || (chess as any).in_checkmate?.();
      const isCheck = (chess as any).isCheck?.() || (chess as any).in_check?.();

      const next: "none" | "check" | "checkmate" = isMate
        ? "checkmate"
        : isCheck
          ? "check"
          : "none";

      // Only pop when status changes (prevents spam on polls/rerenders)
      if (next === lastStatusRef.current) return;
      lastStatusRef.current = next;

      if (next === "checkmate") setStatusMsg("Checkmate.");
      else if (next === "check") setStatusMsg("Check!");
      else setStatusMsg(null);
    } catch {
      // ignore
    }
  }

  // ---- busy flags for mutations
  const [busy, setBusy] = React.useState<{
    resign?: boolean;
    rematch?: boolean;
    offerDraw?: boolean;
    drawRespond?: boolean;
    claimDraw?: boolean;
    addFriend?: boolean;
    acceptFriend?: boolean;
    denyFriend?: boolean;
  }>({});

  // ---- Friends + requests (ids / usernames from your friends page shapes)
  const [friendsS, setFriendsS] = React.useState<LoadState<number[]>>({
    status: "loading",
    data: [],
    error: null,
  });

  const [incomingS, setIncomingS] = React.useState<
    LoadState<
      Array<{ from_user_id: number; from_username: string; id: number }>
    >
  >({
    status: "loading",
    data: [],
    error: null,
  });

  const [outgoingS, setOutgoingS] = React.useState<
    LoadState<Array<{ to_user_id: number; to_username: string; id: number }>>
  >({
    status: "loading",
    data: [],
    error: null,
  });

  const loadFriendsBundle = React.useCallback(async () => {
    try {
      setFriendsS((s) => ({ ...s, status: "loading", error: null }));
      setIncomingS((s) => ({ ...s, status: "loading", error: null }));
      setOutgoingS((s) => ({ ...s, status: "loading", error: null }));

      const [friendsRows, incomingRows, outgoingRows] = await Promise.all([
        getFriendsList(),
        getIncomingFriendRequests(),
        getOutgoingFriendRequests(),
      ]);

      const friendIds = (friendsRows ?? [])
        .map((r: any) => Number(r.id))
        .filter((n: any) => Number.isFinite(n));

      setFriendsS({ status: "ready", data: friendIds, error: null });
      setIncomingS({
        status: "ready",
        data: (incomingRows ?? []) as any,
        error: null,
      });
      setOutgoingS({
        status: "ready",
        data: (outgoingRows ?? []) as any,
        error: null,
      });
    } catch (e) {
      const m = msg(e);
      setFriendsS(
        (s) => ({ status: "error", data: s.data ?? [], error: m }) as any,
      );
      setIncomingS(
        (s) => ({ status: "error", data: s.data ?? [], error: m }) as any,
      );
      setOutgoingS(
        (s) => ({ status: "error", data: s.data ?? [], error: m }) as any,
      );
    }
  }, []);

  // ---- load game
  const loadGame = React.useCallback(async () => {
    setGameS((s) => ({ ...s, status: "loading", error: null }));

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

    setGameS({ status: "ready", data: g, error: null });

    prevFenRef.current = g.fen ?? "startpos";
    lastSeenFenRef.current = g.fen ?? null;

    if (String(g.white_user_id) === myId) setMyColor("w");
    else if (String(g.black_user_id) === myId) setMyColor("b");
    else setMyColor(null);

    if (g.last_move_from && g.last_move_to) {
      setLastMove({ from: g.last_move_from, to: g.last_move_to });
    }

    // ✅ show status for loaded position (without calling in render)
    if (g?.fen && g.fen !== "startpos") maybeShowCheckModal(g.fen);

    return g;
  }, [id]);

  React.useEffect(() => {
    getUserProfile()
      .then((p) => setIsPaidSubscriber(!!p?.paid_subscriber))
      .catch(() => {});

    loadGame().catch((e) =>
      setGameS({ status: "error", data: null, error: msg(e) }),
    );
  }, [loadGame]);

  React.useEffect(() => {
    preloadInterstitial(isPaidSubscriber);
  }, [isPaidSubscriber]);

  // ---- send move
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
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

      const data = JSON.parse(text);

      if (data.last_move_from && data.last_move_to) {
        setLastMove({ from: data.last_move_from, to: data.last_move_to });
      }

      setGameS((s) => ({
        status: "ready",
        error: null,
        data: {
          ...(s.data ?? {}),
          fen: data.fen,
          pgn: data.pgn,
          turn: data.turn,
          status: data.status,
          result: data.result,
          white_time_ms: data.white_time_ms ?? s.data?.white_time_ms ?? null,
          black_time_ms: data.black_time_ms ?? s.data?.black_time_ms ?? null,
          last_move_san: data.move?.san,
          last_move_from: data.last_move_from ?? s.data?.last_move_from ?? null,
          last_move_to: data.last_move_to ?? s.data?.last_move_to ?? null,
        },
      }));

      if (data.fen) {
        prevFenRef.current = data.fen;
        lastSeenFenRef.current = data.fen;
        // Optional: if server sends a different fen than client predicted
        maybeShowCheckModal(data.fen);
      }
    } catch (e) {
      setGameS(
        (s) => ({ status: "error", data: s.data, error: msg(e) }) as any,
      );
    } finally {
      sendingRef.current = false;
    }
  }

  // ---- actions
  async function resign() {
    const ok = await confirm({
      title: "Resign game?",
      message: "You will forfeit this game.",
      confirmText: "Resign",
      destructive: true,
    });
    if (!ok) return;

    try {
      setBusy((b) => ({ ...b, resign: true }));
      await resignGame(String(id));
      await loadGame();
    } catch (e) {
      setGameS(
        (s) => ({ status: "error", data: s.data, error: msg(e) }) as any,
      );
    } finally {
      setBusy((b) => ({ ...b, resign: false }));
    }
  }

  async function rematch() {
    try {
      setBusy((b) => ({ ...b, rematch: true }));
      const newGame = await rematchGame(String(id));
      await maybeShowInterstitial(isPaidSubscriber);
      router.replace(`/game/${newGame.id}`);
    } catch (e) {
      setGameS(
        (s) => ({ status: "error", data: s.data, error: msg(e) }) as any,
      );
    } finally {
      setBusy((b) => ({ ...b, rematch: false }));
    }
  }

  async function askToDraw() {
    try {
      if (!game) return;
      setBusy((b) => ({ ...b, offerDraw: true }));

      await offerDraw(String(game.id));
      await loadGame();

      setStatusMsg("Draw offer sent."); // ✅ POP StatusModal
    } catch (e) {
      setGameS(
        (s) => ({ status: "error", data: s.data, error: msg(e) }) as any,
      );
      setStatusMsg(msg(e)); // optional: show failure reason
    } finally {
      setBusy((b) => ({ ...b, offerDraw: false }));
    }
  }
  async function respondDraw(status: "accepted" | "declined") {
    try {
      if (!game) return;
      setBusy((b) => ({ ...b, drawRespond: true }));
      await respondToDrawOffer(String(game.id), status === "accepted");
      setShowDrawModal(false);
      await loadGame();
    } catch (e) {
      setGameS(
        (s) => ({ status: "error", data: s.data, error: msg(e) }) as any,
      );
    } finally {
      setBusy((b) => ({ ...b, drawRespond: false }));
    }
  }

  // ---- polling while focused
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

          const fenChanged =
            !!fresh?.fen && fresh.fen !== lastSeenFenRef.current;

          const offerChanged =
            fresh.draw_offer_status !== game.draw_offer_status ||
            String(fresh.draw_offer_by ?? "") !==
              String(game.draw_offer_by ?? "") ||
            String(fresh.draw_offer_at ?? "") !==
              String(game.draw_offer_at ?? "");

          if (fenChanged || offerChanged) {
            if (fenChanged) {
              lastSeenFenRef.current = fresh.fen;
              prevFenRef.current = fresh.fen;
              maybeShowCheckModal(fresh.fen);
            }
            setGameS((s) => ({
              status: "ready",
              error: null,
              data: { ...(s.data ?? {}), ...fresh },
            }));
          }
        } catch (e) {
          console.log("poll error:", msg(e));
        } finally {
          if (!alive) return;
          timer = setTimeout(poll, 5000);
        }
      }

      lastSeenFenRef.current = game?.fen ?? null;
      timer = setTimeout(poll, 1500);

      return () => {
        alive = false;
        if (timer) clearTimeout(timer);
      };
    }, [id, game]),
  );

  // ---- derived values
  const isGameOver = game?.status === "completed";

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

  const opponentIdStr = opponentId != null ? String(opponentId) : null;
  const opponentIdNum = opponentIdStr ? Number(opponentIdStr) : null;

  const isFriend =
    opponentIdNum != null &&
    (friendsS.data ?? []).some((fid) => Number(fid) === opponentIdNum);

  const incomingReq = opponentIdNum
    ? (incomingS.data ?? []).find(
        (r) => Number(r.from_user_id) === opponentIdNum,
      )
    : undefined;

  const outgoingReq = opponentIdNum
    ? (outgoingS.data ?? []).find((r) => Number(r.to_user_id) === opponentIdNum)
    : undefined;

  // Load friends/requests when screen focused + when opponent changes
  useFocusEffect(
    React.useCallback(() => {
      loadFriendsBundle();
    }, [loadFriendsBundle, opponentIdStr]),
  );

  const isOpponentDrawPending =
    !!game &&
    game.draw_offer_status === "pending" &&
    game.draw_offer_by != null &&
    myColor != null &&
    String(game.draw_offer_by) === String(opponentId);

  React.useEffect(() => {
    setShowDrawModal(!!isOpponentDrawPending);
  }, [isOpponentDrawPending]);

  React.useEffect(() => {
    if (!game) return;
    if (game.status !== "completed") return;
    if (rematchPromptedRef.current) return;

    rematchPromptedRef.current = true;
    setShowRematch(true);
  }, [game?.status]);

  // board fen
  const START_FEN = React.useMemo(() => new Chess().fen(), []);
  const boardFen = game?.fen && game.fen !== "startpos" ? game.fen : START_FEN;

  const timedMode = Number.isFinite(Number(game?.initial_time_ms));

  React.useEffect(() => {
    if (!timedMode || isGameOver) return;
    const timer = setInterval(() => setClockTick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [timedMode, isGameOver]);

  const liveClock = React.useMemo(() => {
    const baseWhite = Math.max(0, Number(game?.white_time_ms ?? 0));
    const baseBlack = Math.max(0, Number(game?.black_time_ms ?? 0));

    if (!timedMode || !game?.last_clock_at || isGameOver) {
      return { whiteMs: baseWhite, blackMs: baseBlack };
    }

    const elapsed = Math.max(
      0,
      Date.now() - new Date(game.last_clock_at).getTime(),
    );

    if (game.turn === "w") {
      return { whiteMs: Math.max(0, baseWhite - elapsed), blackMs: baseBlack };
    }
    if (game.turn === "b") {
      return { whiteMs: baseWhite, blackMs: Math.max(0, baseBlack - elapsed) };
    }
    return { whiteMs: baseWhite, blackMs: baseBlack };
  }, [
    timedMode,
    game?.white_time_ms,
    game?.black_time_ms,
    game?.last_clock_at,
    game?.turn,
    isGameOver,
    clockTick,
  ]);

  function fmtClock(ms?: number | null) {
    const n = Math.max(0, Number(ms ?? 0));
    const totalSec = Math.floor(n / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  const drawClaimOptions = React.useMemo(() => {
    if (!game || isGameOver) return [] as Array<{
      reason: DrawClaimReason;
      label: string;
      detail: string;
    }>;

    try {
      const chess = new Chess(boardFen);
      const opts: Array<{
        reason: DrawClaimReason;
        label: string;
        detail: string;
      }> = [];

      if ((chess as any).isThreefoldRepetition?.()) {
        opts.push({
          reason: "threefold",
          label: "Threefold",
          detail: "Same position occurred three times.",
        });
      }

      const halfmoveClock = Number(boardFen.split(" ")[4] ?? 0);
      if (Number.isFinite(halfmoveClock) && halfmoveClock >= 100) {
        opts.push({
          reason: "fifty_move",
          label: "50-move",
          detail: "No pawn move or capture in 50 full moves.",
        });
      }

      if ((chess as any).isInsufficientMaterial?.()) {
        opts.push({
          reason: "insufficient_material",
          label: "Insufficient material",
          detail: "Neither side has mating material.",
        });
      }

      return opts;
    } catch {
      return [];
    }
  }, [boardFen, game, isGameOver]);

  async function onClaimDraw(reason: DrawClaimReason, label: string) {
    if (!game) return;

    const ok = await confirm({
      title: "Claim draw?",
      message: `Claim a draw by ${label}?`,
      confirmText: "Claim",
    });
    if (!ok) return;

    try {
      setBusy((b) => ({ ...b, claimDraw: true }));
      await claimDraw(String(game.id), reason);
      setShowClaimModal(false);
      await loadGame();
      setStatusMsg(`Draw claimed: ${label}.`);
    } catch (e) {
      setStatusMsg(msg(e));
      setGameS(
        (s) => ({ status: "error", data: s.data, error: msg(e) }) as any,
      );
    } finally {
      setBusy((b) => ({ ...b, claimDraw: false }));
    }
  }

  // ✅ If the user navigates back/forward and game.fen changes, keep status in sync (no render-time call)
  React.useEffect(() => {
    if (!game?.fen || game.fen === "startpos") return;
    maybeShowCheckModal(game.fen);
  }, [game?.fen]);

  function since(ts?: string) {
    if (!ts) return "—";
    const diffMs = Date.now() - new Date(ts).getTime();
    const totalMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hours > 0) return `${hours}h ${mins}m ago`;
    return `${mins}m ago`;
  }

  // Friend CTA state
  type FriendCta =
    | { kind: "none" }
    | { kind: "incoming"; from_user_id: number; from_username: string }
    | { kind: "outgoing"; to_username: string }
    | { kind: "canAdd"; username: string };

  const friendCta: FriendCta = (() => {
    if (!opponentUsername || opponentIdNum == null) return { kind: "none" };
    if (isFriend) return { kind: "none" };
    if (incomingReq)
      return {
        kind: "incoming",
        from_user_id: incomingReq.from_user_id,
        from_username: incomingReq.from_username,
      };
    if (outgoingReq)
      return { kind: "outgoing", to_username: outgoingReq.to_username };
    return { kind: "canAdd", username: opponentUsername };
  })();
  async function addFriend() {
    if (!opponentUsername) return;
    try {
      setBusy((b) => ({ ...b, addFriend: true }));

      await requestFriend(opponentUsername);
      await loadFriendsBundle();

      setStatusMsg("Friend request sent."); // ✅ POP
      setTimeout(() => setStatusMsg(null), 1500); // optional auto-close
    } catch (e) {
      setStatusMsg(msg(e)); // optional
      Alert.alert("Error", msg(e));
    } finally {
      setBusy((b) => ({ ...b, addFriend: false }));
    }
  }

  async function acceptIncoming(from_user_id: number, from_username: string) {
    const ok = await confirm({
      title: "Accept friend request",
      message: `Accept friend request from ${from_username}?`,
      confirmText: "Accept",
    });
    if (!ok) return;

    try {
      setBusy((b) => ({ ...b, acceptFriend: true }));
      await acceptFriendRequest(from_user_id);
      await loadFriendsBundle();
    } catch (e) {
      Alert.alert("Error", msg(e));
    } finally {
      setBusy((b) => ({ ...b, acceptFriend: false }));
    }
  }

  async function denyIncoming(from_user_id: number, from_username: string) {
    const ok = await confirm({
      title: "Deny friend request",
      message: `Deny friend request from ${from_username}?`,
      confirmText: "Deny",
      destructive: true,
    });
    if (!ok) return;

    try {
      setBusy((b) => ({ ...b, denyFriend: true }));
      await denyFriendRequest(from_user_id);
      await loadFriendsBundle();
    } catch (e) {
      Alert.alert("Error", msg(e));
    } finally {
      setBusy((b) => ({ ...b, denyFriend: false }));
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Top bar */}
      <View
        style={{
          backgroundColor: "#1C2330",
          paddingHorizontal: 12,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255,255,255,0.10)",
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 36,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 26, fontWeight: "900" }}>
            ‹
          </Text>
        </Pressable>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{ color: "#fff", fontSize: 18, fontWeight: "900" }}
            numberOfLines={1}
          >
            {opponentUsername ?? "Game"}
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.70)",
              fontSize: 12,
              fontWeight: "800",
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {isGameOver
              ? "Game over"
              : isMyTurn
                ? "Your move"
                : "Waiting for opponent"}
            {game?.game_mode ? ` • ${String(game.game_mode).toUpperCase()}` : ""}
            {game?.time_control
              ? ` • ${String(game.time_control).toUpperCase()}`
              : ""}
          </Text>
        </View>

        <View
          style={{
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.10)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.12)",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "900" }}>#{id}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 14, paddingBottom: 26, gap: 12 }}
      >
        {gameS.status === "error" ? (
          <ErrorBanner text={gameS.error} onRetry={loadGame} />
        ) : null}
        {gameS.status === "loading" ? <SkeletonRow /> : null}

        {!game ? null : (
          <>
            {/* Status card */}
            <View
              style={{
                backgroundColor: theme.card,
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: 16,
                padding: 12,
              }}
            >
              {/* STATUS */}
              {isGameOver ? (
                <Text
                  style={{
                    marginBottom: 12,
                    fontSize: 18,
                    fontWeight: "900",
                    color: theme.text,
                    textAlign: "center",
                  }}
                >
                  {game.result === "draw"
                    ? "Draw"
                    : game.result === myColor
                      ? "You won 🎉"
                      : "You lost 😔"}
                </Text>
              ) : (
                <View
                  style={{
                    alignSelf: "center",
                    marginBottom: 12,
                    paddingVertical: 6,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    backgroundColor: isMyTurn
                      ? theme.primary
                      : "rgba(248, 244, 28, 0.77)",
                  }}
                >
                  <Text
                    style={{
                      color: isMyTurn ? "#fff" : "rgba(44, 44, 26, 0.55)",
                      fontWeight: "900",
                      fontSize: 14,
                      letterSpacing: 0.3,
                    }}
                  >
                    {isMyTurn ? "YOUR TURN" : "WAITING FOR OPPONENT"}
                  </Text>
                </View>
              )}

              {!isGameOver && game.draw_offer_status === "pending" ? (
                <Text
                  style={{
                    marginBottom: 10,
                    color: theme.subtext,
                    fontWeight: "800",
                    textAlign: "center",
                  }}
                >
                  {String(game.draw_offer_by) === String(opponentId)
                    ? "Opponent offered a draw."
                    : "You offered a draw."}
                </Text>
              ) : null}

              {/* INFO ROW */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <View
                  style={{
                    width: "48%",
                    borderRadius: 14,
                    padding: 10,
                    backgroundColor: "rgba(0,0,0,0.04)",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "900",
                      color: theme.text,
                      textAlign: "center",
                    }}
                  >
                    You
                  </Text>
                  <Text
                    style={{
                      marginTop: 4,
                      fontSize: 16,
                      fontWeight: "900",
                      color: theme.text,
                      textAlign: "center",
                    }}
                  >
                    {myColor === "w"
                      ? "White"
                      : myColor === "b"
                        ? "Black"
                        : "—"}
                  </Text>
                </View>

                <View
                  style={{
                    width: "48%",
                    borderRadius: 14,
                    padding: 10,
                    backgroundColor: "rgba(0,0,0,0.04)",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "900",
                      color: theme.text,
                      textAlign: "center",
                    }}
                  >
                    Turn
                  </Text>
                  <Text
                    style={{
                      marginTop: 4,
                      fontSize: 16,
                      fontWeight: "900",
                      color: theme.text,
                      textAlign: "center",
                    }}
                  >
                    {game.turn === "w"
                      ? "White"
                      : game.turn === "b"
                        ? "Black"
                        : "—"}
                  </Text>
                </View>
              </View>

              {timedMode ? (
                <View style={{ marginTop: 10, flexDirection: "row", gap: 10 }}>
                  <View
                    style={{
                      flex: 1,
                      borderRadius: 12,
                      paddingVertical: 8,
                      paddingHorizontal: 10,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor:
                        game.turn === "w" && !isGameOver
                          ? "rgba(47,107,255,0.14)"
                          : theme.card,
                    }}
                  >
                    <Text style={{ color: theme.subtext, fontWeight: "800" }}>
                      White Clock
                    </Text>
                    <Text
                      style={{
                        marginTop: 3,
                        color: theme.text,
                        fontWeight: "900",
                        fontSize: 20,
                      }}
                    >
                      {fmtClock(liveClock.whiteMs)}
                    </Text>
                  </View>
                  <View
                    style={{
                      flex: 1,
                      borderRadius: 12,
                      paddingVertical: 8,
                      paddingHorizontal: 10,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor:
                        game.turn === "b" && !isGameOver
                          ? "rgba(47,107,255,0.14)"
                          : theme.card,
                    }}
                  >
                    <Text style={{ color: theme.subtext, fontWeight: "800" }}>
                      Black Clock
                    </Text>
                    <Text
                      style={{
                        marginTop: 3,
                        color: theme.text,
                        fontWeight: "900",
                        fontSize: 20,
                      }}
                    >
                      {fmtClock(liveClock.blackMs)}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            <Text style={{ marginTop: 12, fontSize: 14, color: theme.text }}>
              Last move:
            </Text>
            <Text
              style={{ marginTop: 10, fontWeight: "800", color: theme.text }}
            >
              <Text style={{ fontWeight: "900" }}>
                {game.last_move_san ?? "—"}
              </Text>
            </Text>

            {/* Board card */}
            <View
              style={{
                backgroundColor: theme.card,
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: 18,
                padding: 0,
              }}
            >
              <View style={{ width: "100%", aspectRatio: 1, padding: 0 }}>
                <Chessboard
                  fen={boardFen}
                  boardTheme={boardTheme}
                  perspective={myColor === "b" ? "black" : "white"}
                  showCoordinates={false}
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
                  onMove={(from, to, promotion) => {
                    if (!isMyTurn || isGameOver) return;

                    const chess = new Chess(boardFen);
                    const m = chess.move({
                      from,
                      to,
                      promotion: promotion as any,
                    });
                    if (!m) return;

                    const nextFen = chess.fen();
                    const nextTurn = chess.turn();

                    setGameS((s) => ({
                      status: "ready",
                      error: null,
                      data: {
                        ...(s.data ?? {}),
                        fen: nextFen,
                        turn: nextTurn,
                        last_move_from: m.from,
                        last_move_to: m.to,
                      },
                    }));

                    setLastMove({ from: m.from, to: m.to });
                    maybeShowCheckModal(nextFen);

                    sendMove(m.from, m.to, (m as any).promotion);
                  }}
                />

                {(!isMyTurn || isGameOver || promoPendingRef.current) && (
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
            </View>

            {/* Actions */}
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {!isGameOver ? (
                  <>
                    <Pressable
                      onPress={resign}
                      disabled={!!busy.resign}
                      style={({ pressed }) => [
                        {
                          flex: 1,
                          paddingVertical: 12,
                          borderRadius: 16,
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: 1,
                          borderColor: "#E5484D",
                          backgroundColor: "#E5484D",
                          opacity: busy.resign ? 0.55 : 1,
                        },
                        pressed && !busy.resign
                          ? { transform: [{ scale: 0.99 }], opacity: 0.97 }
                          : null,
                      ]}
                    >
                      <Text style={{ color: "#fff", fontWeight: "900" }}>
                        {busy.resign ? "Resigning..." : "Resign"}
                      </Text>
                    </Pressable>

                    {game.draw_offer_status == null ||
                    game.draw_offer_status === "declined" ? (
                      <Pressable
                        onPress={askToDraw}
                        disabled={!!busy.offerDraw}
                        style={({ pressed }) => [
                          {
                            flex: 1,
                            paddingVertical: 12,
                            borderRadius: 16,
                            alignItems: "center",
                            justifyContent: "center",
                            borderWidth: 1,
                            borderColor: "rgba(255,255,255,0.14)",
                            backgroundColor: "#1C2330",
                            opacity: busy.offerDraw ? 0.55 : 1,
                          },
                          pressed && !busy.offerDraw
                            ? { transform: [{ scale: 0.99 }], opacity: 0.97 }
                            : null,
                        ]}
                      >
                        <Text style={{ color: "#fff", fontWeight: "900" }}>
                          {busy.offerDraw ? "Offering..." : "Offer Draw"}
                        </Text>
                      </Pressable>
                    ) : (
                      <View
                        style={{
                          flex: 1,
                          paddingVertical: 12,
                          borderRadius: 16,
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: 1,
                          borderColor: theme.border,
                          backgroundColor: theme.card,
                        }}
                      >
                        <Text
                          style={{ color: theme.subtext, fontWeight: "900" }}
                        >
                          Draw offer pending
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <Pressable
                    onPress={rematch}
                    disabled={!!busy.rematch}
                    style={({ pressed }) => [
                      {
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 16,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 1,
                        borderColor: theme.primary,
                        backgroundColor: theme.primary,
                        opacity: busy.rematch ? 0.55 : 1,
                      },
                      pressed && !busy.rematch
                        ? { transform: [{ scale: 0.99 }], opacity: 0.97 }
                        : null,
                    ]}
                  >
                    <Text style={{ color: "#fff", fontWeight: "900" }}>
                      {busy.rematch ? "Rematching..." : "Rematch"}
                    </Text>
                  </Pressable>
                )}
              </View>

              {!isGameOver ? (
                <Pressable
                  onPress={() => setShowClaimModal(true)}
                  disabled={drawClaimOptions.length === 0 || !!busy.claimDraw}
                  style={({ pressed }) => [
                    {
                      paddingVertical: 12,
                      borderRadius: 16,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.card,
                      opacity:
                        drawClaimOptions.length === 0 || busy.claimDraw
                          ? 0.6
                          : 1,
                    },
                    pressed && drawClaimOptions.length > 0 && !busy.claimDraw
                      ? { transform: [{ scale: 0.99 }], opacity: 0.97 }
                      : null,
                  ]}
                >
                  <Text style={{ color: theme.text, fontWeight: "900" }}>
                    {busy.claimDraw
                      ? "Claiming..."
                      : drawClaimOptions.length
                        ? `Claim Draw (${drawClaimOptions.length})`
                        : "No draw claims available"}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {/* Friend Request CTA (bottom) */}
            {(() => {
              if (friendCta.kind === "outgoing") {
                return (
                  <View
                    style={{
                      paddingVertical: 12,
                      borderRadius: 16,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.card,
                    }}
                  >
                    <Text style={{ color: theme.subtext, fontWeight: "900" }}>
                      Friend request sent
                    </Text>
                  </View>
                );
              }
              if (friendCta.kind === "canAdd") {
                return (
                  <Pressable
                    onPress={addFriend}
                    disabled={!!busy.addFriend}
                    style={({ pressed }) => [
                      {
                        paddingVertical: 12,
                        borderRadius: 16,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.14)",
                        backgroundColor: "#1C2330",
                        opacity: busy.addFriend ? 0.55 : 1,
                      },
                      pressed && !busy.addFriend
                        ? { transform: [{ scale: 0.99 }], opacity: 0.97 }
                        : null,
                    ]}
                  >
                    <Text style={{ color: "#fff", fontWeight: "900" }}>
                      {busy.addFriend ? "Adding…" : `Add ${friendCta.username}`}
                    </Text>
                  </Pressable>
                );
              }
              if (friendCta.kind === "incoming") {
                return (
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View
                      style={{
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: theme.border,
                        backgroundColor: theme.card,
                      }}
                    >
                      <Text
                        style={{
                          color: theme.text,
                          fontWeight: "900",
                          fontSize: 16,
                        }}
                        numberOfLines={2}
                      >
                        {friendCta.from_username} has sent you a friend request{" "}
                        <Text
                          style={{
                            color: "#E5484D",
                            fontWeight: "900",
                            fontSize: 18,
                          }}
                        >
                          !
                        </Text>
                      </Text>
                    </View>

                    <Pressable
                      onPress={() =>
                        denyIncoming(
                          friendCta.from_user_id,
                          friendCta.from_username,
                        )
                      }
                      disabled={!!busy.denyFriend || !!busy.acceptFriend}
                      style={({ pressed }) => [
                        {
                          flex: 1,
                          paddingVertical: 12,
                          borderRadius: 16,
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: 1,
                          borderColor: "#E5484D",
                          backgroundColor: "#E5484D",
                          opacity:
                            busy.denyFriend || busy.acceptFriend ? 0.55 : 1,
                        },
                        pressed && !(busy.denyFriend || busy.acceptFriend)
                          ? { transform: [{ scale: 0.99 }], opacity: 0.97 }
                          : null,
                      ]}
                    >
                      <Text style={{ color: "#fff", fontWeight: "900" }}>
                        {busy.denyFriend ? "…" : "Deny"}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() =>
                        acceptIncoming(
                          friendCta.from_user_id,
                          friendCta.from_username,
                        )
                      }
                      disabled={!!busy.acceptFriend || !!busy.denyFriend}
                      style={({ pressed }) => [
                        {
                          flex: 1,
                          paddingVertical: 12,
                          borderRadius: 16,
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: 1,
                          borderColor: "rgba(255,255,255,0.14)",
                          backgroundColor: "#1C2330",
                          opacity:
                            busy.acceptFriend || busy.denyFriend ? 0.55 : 1,
                        },
                        pressed && !(busy.acceptFriend || busy.denyFriend)
                          ? { transform: [{ scale: 0.99 }], opacity: 0.97 }
                          : null,
                      ]}
                    >
                      <Text style={{ color: "#fff", fontWeight: "900" }}>
                        {busy.acceptFriend ? "…" : "Accept"}
                      </Text>
                    </Pressable>
                  </View>
                );
              }
              return null;
            })()}

            {showCastleTip && (
              <Text
                style={{
                  color: theme.subtext,
                  fontStyle: "italic",
                  fontWeight: "700",
                }}
              >
                Tip: To castle, drag the king.
              </Text>
            )}
          </>
        )}
      </ScrollView>

      {/* Draw Modal */}
      <Modal visible={showDrawModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.55)",
            justifyContent: "center",
            padding: 18,
          }}
        >
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 18,
              padding: 16,
              gap: 10,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text
              style={{ fontSize: 18, fontWeight: "900", color: theme.text }}
            >
              {opponentUsername ?? "Opponent"} offered a draw
            </Text>
            {game?.draw_offer_at ? (
              <Text style={{ color: theme.subtext, fontWeight: "800" }}>
                Offered {since(game.draw_offer_at)}
              </Text>
            ) : null}

            <Pressable
              onPress={() => respondDraw("accepted")}
              disabled={!!busy.drawRespond}
              style={({ pressed }) => [
                {
                  paddingVertical: 12,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: theme.primary,
                  backgroundColor: theme.primary,
                  opacity: busy.drawRespond ? 0.55 : 1,
                },
                pressed && !busy.drawRespond
                  ? { transform: [{ scale: 0.99 }], opacity: 0.97 }
                  : null,
              ]}
            >
              <Text style={{ color: "#fff", fontWeight: "900" }}>
                {busy.drawRespond ? "Working…" : "Accept draw"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => respondDraw("declined")}
              disabled={!!busy.drawRespond}
              style={({ pressed }) => [
                {
                  paddingVertical: 12,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                  opacity: busy.drawRespond ? 0.55 : 1,
                },
                pressed && !busy.drawRespond
                  ? { transform: [{ scale: 0.99 }], opacity: 0.97 }
                  : null,
              ]}
            >
              <Text style={{ color: theme.text, fontWeight: "900" }}>
                {busy.drawRespond ? "Working…" : "Decline"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Draw Claim Modal */}
      <Modal visible={showClaimModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.55)",
            justifyContent: "center",
            padding: 18,
          }}
        >
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 18,
              padding: 16,
              gap: 10,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "900", color: theme.text }}>
              Claim draw
            </Text>

            {drawClaimOptions.length === 0 ? (
              <Text style={{ color: theme.subtext, fontWeight: "700" }}>
                No claimable draw conditions in the current position.
              </Text>
            ) : (
              drawClaimOptions.map((opt) => (
                <Pressable
                  key={opt.reason}
                  onPress={() => onClaimDraw(opt.reason, opt.label)}
                  disabled={!!busy.claimDraw}
                  style={({ pressed }) => [
                    {
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.card,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      opacity: busy.claimDraw ? 0.55 : 1,
                    },
                    pressed && !busy.claimDraw
                      ? { transform: [{ scale: 0.99 }], opacity: 0.96 }
                      : null,
                  ]}
                >
                  <Text style={{ color: theme.text, fontWeight: "900" }}>
                    {opt.label}
                  </Text>
                  <Text
                    style={{
                      marginTop: 2,
                      color: theme.subtext,
                      fontWeight: "700",
                      fontSize: 12,
                    }}
                  >
                    {opt.detail}
                  </Text>
                </Pressable>
              ))
            )}

            <Pressable
              onPress={() => setShowClaimModal(false)}
              disabled={!!busy.claimDraw}
              style={({ pressed }) => [
                {
                  paddingVertical: 12,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                  opacity: busy.claimDraw ? 0.55 : 1,
                },
                pressed && !busy.claimDraw
                  ? { transform: [{ scale: 0.99 }], opacity: 0.97 }
                  : null,
              ]}
            >
              <Text style={{ color: theme.text, fontWeight: "900" }}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Rematch Modal */}
      <Modal transparent animationType="fade" visible={showRematch}>
        <View style={styles.overlay}>
          <View
            style={[
              styles.modal,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                borderWidth: 1,
              },
            ]}
          >
            <Text
              style={{ fontSize: 18, fontWeight: "900", color: theme.text }}
            >
              Game over
            </Text>
            <Text
              style={{
                marginTop: 6,
                color: theme.subtext,
                fontWeight: "800",
                fontSize: 16,
              }}
            >
              Play another game with the same opponent?
            </Text>

            <View style={styles.actions}>
              <Pressable
                onPress={async () => {
                  setShowRematch(false);
                  await maybeShowInterstitial(isPaidSubscriber);
                  router.replace("/(tabs)");
                }}
              >
                <Text
                  style={{
                    color: theme.subtext,
                    fontWeight: "900",
                    fontSize: 16,
                  }}
                >
                  Back to Lobby
                </Text>
              </Pressable>

              <Pressable
                onPress={async () => {
                  setShowRematch(false);
                  await rematch();
                }}
              >
                <Text
                  style={{
                    color: theme.primary,
                    fontWeight: "900",
                    fontSize: 16,
                  }}
                >
                  Yes
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ✅ Check / Checkmate modal */}
      <StatusModal
        visible={!!statusMsg}
        title="Game Status"
        message={statusMsg ?? ""}
        onClose={() => setStatusMsg(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "space-evenly",
    padding: 48,
    alignContent: "center",
    alignSelf: "center",
  },
  modal: {
    width: 280,
    maxWidth: "90%",
    borderRadius: 18,
    padding: 16,
    gap: 10,
    alignItems: "center",
  },
  actions: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-evenly",
    gap: 20,
  },
});
