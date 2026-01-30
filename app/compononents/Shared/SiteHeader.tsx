import React from "react";
import { View, Text } from "react-native";
import { Theme } from "../../../lib/theme";

type Props = {
  title: string;
  subtitle?: string;
  theme: Theme;
  right?: React.ReactNode;
};

export default function SiteHeader({ title, subtitle, theme, right }: Props) {
  return (
    <View
      style={{
        backgroundColor: "#2a3e63", // dark blue-gray header
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.08)",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "900",
              color: "#FFFFFF",
            }}
          >
            {title}
          </Text>
          {!!subtitle && (
            <Text
              style={{
                marginTop: 2,
                color: "rgba(255,255,255,0.7)",
                fontWeight: "700",
              }}
            >
              {subtitle}
            </Text>
          )}
        </View>
        {right}
      </View>
    </View>
  );
}
