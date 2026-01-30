import React from "react";
import { View, ActivityIndicator, Text, Button } from "react-native";

export function ErrorBanner({
  text,
  onRetry,
}: {
  text: string;
  onRetry: () => void;
}) {
  return (
    <View style={{ padding: 12, borderWidth: 1, marginVertical: 8 }}>
      <Text style={{ fontWeight: "700" }}>Something went wrong</Text>
      <Text style={{ marginTop: 4 }}>{text}</Text>
      <View style={{ height: 8 }} />
      <Button title="Close" onPress={onRetry} />
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
