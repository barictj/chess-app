import { View, Text, Button, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";

export default function ProfileScreen() {
  const router = useRouter();

  async function logout() {
    if (Platform.OS === "web") {
      localStorage.removeItem("auth_token");
    } else {
      await SecureStore.deleteItemAsync("auth_token");
    }

    router.replace("/(auth)/login");
  }

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Profile</Text>
      <Button title="Logout" onPress={logout} />
    </View>
  );
}
