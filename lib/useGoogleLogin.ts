// chess/chessapp/lib/useGoogleLogin.ts
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";

WebBrowser.maybeCompleteAuthSession();

export function useGoogleLogin() {
    const [request, response, promptAsync] = Google.useAuthRequest({
        clientId: "480340994422-gane4t3n05kvrlu7a7ga4g5o1ab5lp1p.apps.googleusercontent.com",
        scopes: ["profile", "email"],
    });

    return { request, response, promptAsync };
}

