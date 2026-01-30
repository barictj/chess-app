import { View, Text, TextInput, Button } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { setUsername } from "../lib/api";

export default function SetUsername() {
  const [username, setUser] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSave() {
    if (!username.trim()) return;
    try {
      setLoading(true);
      setErr(null);
      await setUsername(username.trim());
      router.replace("/(tabs)"); // back to lobby
    } catch (e: any) {
      setErr(e?.message ?? "Failed to set username");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: "600" }}>Choose a username</Text>

      <TextInput
        value={username}
        onChangeText={setUser}
        placeholder="Username"
        autoCapitalize="none"
        style={{ borderWidth: 1, padding: 10, marginVertical: 12 }}
      />

      {err && <Text style={{ color: "red" }}>{err}</Text>}

      <Button title={loading ? "Saving..." : "Save"} onPress={onSave} />
    </View>
  );
}
