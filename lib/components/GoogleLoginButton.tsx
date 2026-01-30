import { Button } from "react-native";
import { useEffect } from "react";
import { useGoogleLogin } from "../useGoogleLogin";
import { loginWithGoogle } from "../api";
import { saveToken } from "../token";

export function GoogleLoginButton({ onLoggedIn }: { onLoggedIn: () => void }) {
    const { request, response, promptAsync } = useGoogleLogin();

    useEffect(() => {
        if (response?.type === "success") {
            const accessToken = response.authentication?.accessToken;
            if (!accessToken) return;

            loginWithGoogle(accessToken)
                .then(({ token }) => {
                    return saveToken(token);
                })
                .then(onLoggedIn)
                .catch(console.error);
        }
    }, [response]);

    return (
        <Button
            disabled={!request}
            title="Sign in with Google"
            onPress={() => promptAsync()}
        />
    );
}
