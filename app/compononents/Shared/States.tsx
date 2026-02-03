import React from "react";
import { View, ActivityIndicator, Text, Button } from "react-native";
import { useTheme } from "../../../lib/ThemeContext";
export default function ErrorBanner({
  text,
  onRetry,
}: {
  text: string;
  onRetry: () => void;
}) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        padding: 12,
        borderWidth: 1,
        marginVertical: 8,
        borderColor: theme.border,
        backgroundColor: theme.bg,
      }}
    >
      <Text
        style={{
          marginTop: 4,
          color: theme.text,
          fontSize: 16,
          fontWeight: "bold",
        }}
      >
        {text}
      </Text>
      <View style={{ height: 8 }} />
      <Button title="Close" onPress={onRetry} color={theme.primary} />
    </View>
  );
}

export function SkeletonRow() {
  return (
    <View style={{ padding: 16, alignItems: "center" }}>
      <ActivityIndicator size="small" />
    </View>
  );
}
