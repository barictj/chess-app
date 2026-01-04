// chess/chessapp/app/%28auth%29/login.tsx
import { View, Text, Button } from "react-native";
import { useEffect } from "react";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { setToken } from "../../lib/token";
import Constants from "expo-constants";

WebBrowser.maybeCompleteAuthSession();
//
export default function LoginScreen() {
    useEffect(() => {
        const sub = Linking.addEventListener("url", async ({ url }) => {
            const parsed = Linking.parse(url);

            const token = parsed.queryParams?.token;
            if (typeof token === "string") {
                await setToken(token);
                router.replace("/(tabs)");
            }
        });

        return () => sub.remove();
    }, []);

    async function loginWithGoogle() {
        const backend = Constants.expoConfig?.extra?.BACKEND_URL;

        const redirectUri = Linking.createURL("login");

        const authUrl =
            `${backend}/auth/google?redirect_uri=` +
            encodeURIComponent(redirectUri);

        await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
    }

    return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text>Login</Text>
            <Button title="Login with Google" onPress={loginWithGoogle} />
        </View>
    );
}
