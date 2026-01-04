import { View, Text, Button } from "react-native";
import { router } from "expo-router";

export default function LoginScreen() {
    return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text>Login</Text>
            <Button title="Login (fake)" onPress={() => router.replace("/(tabs)")} />
        </View>
    );
}
