// chess/chessapp/lib/googleLogin.ts

import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { setToken } from "./token";
import { BACKEND_URL } from "./config";
WebBrowser.maybeCompleteAuthSession();

if (!BACKEND_URL) {
  throw new Error("BACKEND_URL missing from app.json");
}

export async function loginWithGoogle() {
  const redirectUri = Linking.createURL("auth");

  const authUrl =
    `${BACKEND_URL}/auth/google?redirect_uri=` +
    encodeURIComponent(redirectUri);

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

  if (result.type !== "success" || !result.url) return;

  const { queryParams } = Linking.parse(result.url);
  const token = queryParams?.token;

  if (typeof token === "string") {
    await setToken(token);
  }
}
