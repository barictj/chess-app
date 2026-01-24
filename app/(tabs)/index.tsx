import React, { useCallback, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Button,
  TextInput,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { router } from "expo-router";
import { getActiveGames } from "../../lib/api";
import { useFocusEffect } from "@react-navigation/native";
import { useState } from "react";
import {
  createGame,
  findRandomGame,
  getUserProfile,
  playAgainstBot,
} from "../../lib/api";

export default function Lobby() {
  const [games, setGames] = React.useState<any[]>([]);
  const [err, setErr] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<any>(null);
  useEffect(() => {
    (async () => {
      try {
        const profile = await getUserProfile();
        console.log("User profile:", profile);
        setProfile(profile);
        if (profile.username_set === 0) {
          router.replace("/set-username");
        }
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
      }
    })();
  }, []);
  console.log(profile);

  const fetchGames = useCallback(async () => {
    setErr(null);
    const data = await getActiveGames();
    setGames(data);
  }, []);
  const [username, setUsername] = useState("");
  async function onRandomGame() {
    const game = await findRandomGame();
    router.push(`/game/${game.id}`);
  }
  async function onInvite() {
    const game = await createGame(username);
    router.push(`/game/${game.id}`);
  }
  async function onPlayBot() {
    const game = await playAgainstBot();
    router.push(`/game/${game.id}`);
  }

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        try {
          setErr(null);
          const data = await getActiveGames();
          if (!cancelled) setGames(data);
        } catch (e: any) {
          if (!cancelled) setErr(e?.message ?? String(e));
        }
      })();

      return () => {
        cancelled = true;
      };
    }, []),
  );

  return (
    <SafeAreaView style={{ flex: 1, paddingBottom: 0, marginTop: 0 }}>
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "700" }}>
          {profile ? `@${profile.username}` : "Loading…"}
        </Text>
        {profile ? (
          <Text style={{ opacity: 0.7 }}>Rating: {profile.rating}</Text>
        ) : null}
      </View>

      <TextInput
        placeholder="Opponent username"
        value={username}
        onChangeText={setUsername}
        style={{ borderWidth: 1, marginVertical: 8, padding: 8 }}
      />

      <Button title="Invite User" onPress={onInvite} />
      <View style={{ height: 8 }} />
      <Button title="Find Random Game" onPress={onRandomGame} />
      <View style={{ height: 8 }} />
      <Button title="Play Against Bot" onPress={onPlayBot} />

      <Text style={{ fontSize: 18, fontWeight: "600" }}>Active Games</Text>

      {err ? <Text style={{ marginTop: 8 }}>Error: {err}</Text> : null}

      <FlatList
        data={games}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: 0 }}
        ListEmptyComponent={
          <Text style={{ marginTop: 12 }}>No active games</Text>
        }
        renderItem={({ item: game }) => {
          const myTurn = profile && game.to_move_user_id === profile.id;

          return (
            <Pressable
              onPress={() => router.push(`/game/${game.id}`)}
              style={{
                padding: 12,
                marginTop: 8,
                borderWidth: 1,
                borderRadius: 6,
              }}
            >
              {myTurn && (
                <Text style={{ fontWeight: "700", marginBottom: 4 }}>
                  YOUR TURN
                </Text>
              )}

              <Text>Game #{game.id}</Text>
              <Text>Status: {game.status}</Text>

              {game.opponent_username ? (
                <Text>Opponent: {game.opponent_username}</Text>
              ) : null}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}
