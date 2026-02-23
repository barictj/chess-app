import { getToken } from "./token";
import { BACKEND_URL } from "./config";

console.log("Using BACKEND_URL:", BACKEND_URL);
export type GameCreateOptions = {
  game_mode?: "casual" | "ranked";
  time_control?: "bullet" | "blitz" | "rapid" | "daily";
  initial_time_ms?: number | null;
  increment_ms?: number | null;
};

export async function createGame(
  opponentUsername: string,
  options: GameCreateOptions = {},
) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${BACKEND_URL}/api/games`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ opponent_username: opponentUsername, ...options }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to create game");
  }

  return res.json(); // returns the object you pasted
}
export async function createInvitedGame(
  opponent_username: string,
  options: GameCreateOptions = {},
) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${BACKEND_URL}/api/games/invite`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ opponent_username, ...options }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to create invited game");
  }
  return res.json();
}
//list game invites for user
export async function getGameInvites() {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${BACKEND_URL}/api/games/invites`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  return JSON.parse(text);
}

// accept game invite
export async function acceptInvitedGame(gameId: string) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${BACKEND_URL}/api/games/${gameId}/accept`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ gameId: Number(gameId) }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to accept invited game");
  }
  return res.json();
}
// deny game invite
export async function denyInvitedGame(gameId: string) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${BACKEND_URL}/api/games/${gameId}/deny`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ gameId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to deny invited game");
  }
  return res.json();
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
export async function findRandomGame(options: GameCreateOptions = {}) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${BACKEND_URL}/api/games/random`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options),
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
export async function playAgainstBot(options: GameCreateOptions = {}) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${BACKEND_URL}/api/games/play_bot`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to create game against bot");
  }
  return res.json();
}
export async function resignGame(gameId: string) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${BACKEND_URL}/api/games/${gameId}/resign`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ gameId: gameId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to resign game");
  }
  return res.json();
}
export async function rematchGame(gameId: string) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${BACKEND_URL}/api/games/${gameId}/rematch`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ gameId: gameId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to request rematch");
  }
  return res.json();
}
export async function offerDraw(gameId: string) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${BACKEND_URL}/api/games/${gameId}/draw/offer`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ gameId: gameId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to offer draw");
  }
  return res.json();
}
export async function respondToDrawOffer(gameId: string, accept: boolean) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");
  if (accept) {
    const res = await fetch(`${BACKEND_URL}/api/games/${gameId}/draw/accept`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ gameId: gameId }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to accept draw");
    }
    return res.json();
  } else {
    const res = await fetch(`${BACKEND_URL}/api/games/${gameId}/draw/deny`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ gameId: gameId }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to deny draw");
    }
    return res.json();
  }
}

export type DrawClaimReason =
  | "threefold"
  | "fifty_move"
  | "insufficient_material";

export async function claimDraw(gameId: string, reason: DrawClaimReason) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");

  const candidatePaths: Record<DrawClaimReason, string[]> = {
    threefold: [
      `/api/games/${gameId}/draw/claim/threefold`,
      `/api/games/${gameId}/draw/claim?reason=threefold`,
    ],
    fifty_move: [
      `/api/games/${gameId}/draw/claim/fifty-move`,
      `/api/games/${gameId}/draw/claim/fifty_move`,
      `/api/games/${gameId}/draw/claim?reason=fifty_move`,
    ],
    insufficient_material: [
      `/api/games/${gameId}/draw/claim/insufficient-material`,
      `/api/games/${gameId}/draw/claim/insufficient_material`,
      `/api/games/${gameId}/draw/claim?reason=insufficient_material`,
    ],
  };

  let lastError = "";

  for (const path of candidatePaths[reason]) {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ gameId, reason }),
    });

    const text = await res.text();

    if (res.ok) {
      try {
        return JSON.parse(text);
      } catch {
        return { ok: true };
      }
    }

    if (res.status === 404) {
      lastError = text || `HTTP ${res.status}`;
      continue;
    }

    throw new Error(text || `HTTP ${res.status}`);
  }

  throw new Error(lastError || "Draw claim endpoint not available");
}
export async function requestFriend(friendUsername: string) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${BACKEND_URL}/api/friends/request`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to: friendUsername }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to send friend request");
  }
  return res.json();
}
export async function getFriendsList() {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${BACKEND_URL}/api/friends`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  return JSON.parse(text);
}
export async function acceptFriendRequest(fromUserId: number) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${BACKEND_URL}/api/friends/accept`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: fromUserId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to accept friend request");
  }
  return res.json();
}
// Deny friend request
export async function denyFriendRequest(fromUserId: number) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${BACKEND_URL}/api/friends/deny`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: fromUserId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to deny friend request");
  }
  return res.json();
}

export async function blockUser(user_id: string) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${BACKEND_URL}/api/friends/block`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id: user_id }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to block user");
  }
  return res.json();
}
export async function unblockUser(user_id: string) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${BACKEND_URL}/api/friends/unblock`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id: user_id }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to unblock user");
  }
  return res.json();
}
export async function getIncomingFriendRequests() {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${BACKEND_URL}/api/friends/requests/incoming`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  return JSON.parse(text);
}
export async function getOutgoingFriendRequests() {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${BACKEND_URL}/api/friends/requests/outgoing`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  return JSON.parse(text);
}
// Delete user account
export async function deleteUserAccount() {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${BACKEND_URL}/api/users/delete_account`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  return JSON.parse(text);
}
// Get user avatar URL by user ID
export async function getUserAvatarUrl(userId: number) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(
    `${BACKEND_URL}/api/users/user_avatar_url/${userId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  const data = JSON.parse(text);
  return data.avatarUrl;
}
export async function setUserAvatarUrl(avatarUrl: string) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${BACKEND_URL}/api/users/set_avatar_url`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ avatarUrl }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  return JSON.parse(text);
}
//Get User Stats by user ID
export async function getUserStats(userId: number) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetch(`${BACKEND_URL}/api/stats/${userId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  return JSON.parse(text);
}
