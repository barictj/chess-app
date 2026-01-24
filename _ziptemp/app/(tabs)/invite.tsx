import { View, Text, Button, TextInput } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { createGame } from "../../lib/api";

export default function Lobby() {
  const [username, setUsername] = useState("");

  async function onInvite() {
    const game = await createGame(username);
    router.push(`/game/${game.id}`);
  }

  return <View style={{ padding: 16 }}></View>;
}
