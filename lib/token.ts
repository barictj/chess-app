// lib/token.ts
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "auth_token";

export async function setToken(token: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(KEY, token);
    return;
  }
  await SecureStore.setItemAsync(KEY, token);
}

export async function getToken(): Promise<string | null> {
  const platform = Platform.OS;

  try {
    let t: string | null = null;

    if (platform === "web") {
      t = localStorage.getItem(KEY);
    } else {
      t = await SecureStore.getItemAsync(KEY);
    }

    return t;
  } catch (e: any) {
    console.log(`[token] getToken ERROR platform=${platform}`, e?.message ?? e);
    return null;
  }
}

export async function clearToken() {
  if (Platform.OS === "web") {
    localStorage.removeItem(KEY);
    return;
  }
  await SecureStore.deleteItemAsync(KEY);
}
