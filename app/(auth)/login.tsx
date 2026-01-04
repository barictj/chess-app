import React from "react";
import { View, Button } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import Constants from "expo-constants";

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL;
console.log("BACKEND_URL:", BACKEND_URL);

export default function LoginScreen() {
    const redirectUri = Linking.createURL("/");

    console.log("REDIRECT URI:", redirectUri);

    const login = async () => {
        const authUrl = `${BACKEND_URL}/auth/google?redirect_uri=${encodeURIComponent(
            redirectUri
        )}`;

        console.log("AUTH URL:", authUrl);   // ⭐ THIS IS THE LINE YOU NEED

        await WebBrowser.openBrowserAsync(authUrl);
    };

    return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Button title="Login with Google" onPress={login} />
        </View>
    );
}
