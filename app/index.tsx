import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import { getToken } from "../src/auth/token";

export default function Index() {
    useEffect(() => {
        getToken().then(token => {
            if (token) {
                router.replace({ pathname: "/(tabs)" });
            } else {
                router.replace({ pathname: "/(auth)/login" });
            }
        });
    }, []);

    return (
        <View style={{ flex: 1, justifyContent: "center" }}>
            <ActivityIndicator />
        </View>
    );
}
