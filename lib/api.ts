import Constants from "expo-constants";
import { getToken } from "./token";

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL;

export async function createGame(opponentUsername: string) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${BACKEND_URL}/api/games`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ opponent_username: opponentUsername }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to create game");
  }

  return res.json(); // returns the object you pasted
}
export async function getActiveGames() {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${BACKEND_URL}/api/games/active`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

  return JSON.parse(text);
}
export async function findRandomGame(opponentUsername: string) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${BACKEND_URL}/api/games/random`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ opponent_username: opponentUsername }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to create game");
  }

  return res.json(); // returns the object you pasted
}
export async function getUserProfile() {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${BACKEND_URL}/api/users/user_profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

  return JSON.parse(text);
}
export async function setUsername(username: string) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${BACKEND_URL}/api/users/set_username`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  return JSON.parse(text);
}
