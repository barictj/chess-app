import { View, Text, Button } from "react-native";
import { router } from "expo-router";

export default function HomeScreen() {
    return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text>Home</Text>
            <Button title="Go to Login" onPress={() => router.push("/login")} />
        </View>
    );
}
