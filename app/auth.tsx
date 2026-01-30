// chess/chessapp/app/auth.tsx

import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import { getToken } from "../lib/token"; // adjust path if needed

export default function AuthRedirect() {
    useEffect(() => {
        let mounted = true;

        (async () => {
            const token = await getToken();

            if (!mounted) return;

            router.replace(token ? "/(tabs)" : "/(auth)/login");
        })();

        return () => {
            mounted = false;
        };
    }, []);

    return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator />
        </View>
    );
}
