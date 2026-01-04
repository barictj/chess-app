import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import { getToken } from "../src/auth/token";

export default function Index() {
    useEffect(() => {
        getToken().then(token => {
            if (token) {
                router.replace("/home");
            } else {
                router.replace("/login");
            }
        });
    }, []);

    return (
        <View style={{ flex: 1, justifyContent: "center" }}>
            <ActivityIndicator />
        </View>
    );
}
