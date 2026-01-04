export async function loginWithGoogle(accessToken: string) {
    const res = await fetch("http://localhost:3000/auth/google", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ accessToken }),
    });

    if (!res.ok) {
        throw new Error("Google login failed");
    }

    return res.json(); // { token }
}
