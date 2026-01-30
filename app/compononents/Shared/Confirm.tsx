// lib/confirm.ts
import { Alert, Platform } from "react-native";

type ConfirmParams = {
  title?: string; // default: "Are you sure?"
  message: string;
  confirmText: string; // "Resign" | "Delete" | "Block" | etc
  destructive?: boolean; // makes button red on iOS
  onConfirm: () => void | Promise<void>;
};

export function confirmAlert({
  title = "Are you sure?",
  message,
  confirmText,
  destructive = false,
  onConfirm,
}: ConfirmParams) {
  Alert.alert(
    title,
    message,
    [
      { text: "Cancel", style: "cancel" }, // left
      {
        text: confirmText, // right
        style: destructive ? "destructive" : "default",
        onPress: () => onConfirm(),
      },
    ],
    { cancelable: true },
  );
}

// Optional: Promise<boolean> version
type ConfirmPromiseParams = Omit<ConfirmParams, "onConfirm">;

export function confirm({
  title = "Are you sure?",
  message,
  confirmText,
  destructive = false,
}: ConfirmPromiseParams): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        {
          text: confirmText,
          style: destructive ? "destructive" : "default",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
