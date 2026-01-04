import React, { useState, useEffect } from "react";
import { View, Button, StyleSheet } from "react-native";
import Chessboard from "react-native-chessboard";
import { Chess } from "chess.js";
import * as SecureStore from "expo-secure-store";

const GAME_ID = "e6280ce3-319c-4a1e-9574-66d6ccd35134"; // replace with your game UUID
const API_URL = "http://192.168.4.27:3000/api/games";   // use LAN IP, not localhost

export default function ChessBoardScreen() {
    const [chess, setChess] = useState(() => new Chess());
    const [fen, setFen] = useState(chess.fen());

    // Load moves from backend
    useEffect(() => {
        const loadMoves = async () => {
            try {
                const res = await fetch(`${API_URL}/${GAME_ID}/moves`);
                const moves = await res.json();

                const game = new Chess();
                moves.forEach((m: any) => {
                    game.move({
                        from: m.from_sq,
                        to: m.to_sq,
                        promotion: m.promotion || undefined,
                    });
                });

                setChess(game);
                setFen(game.fen());
            } catch (err) {
                console.error("Fetch moves error:", err);
            }
        };

        loadMoves();
    }, []);

    // Handle move on board
    const onMove = async (from: string, to: string) => {
        try {
            const res = await fetch(`${API_URL}/${GAME_ID}/move`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ from, to }),
            });
            const data = await res.json();

            if (data?.game?.fen) {
                const updated = new Chess(data.game.fen);
                setChess(updated);
                setFen(updated.fen());
            }
        } catch (err) {
            console.error("Move error:", err);
        }
    };

    return (
        <View style={styles.container}>
            <Chessboard fen={fen} onMove={onMove} />
            <Button
                title="Reset"
                onPress={() => {
                    const fresh = new Chess();
                    setChess(fresh);
                    setFen(fresh.fen());
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
