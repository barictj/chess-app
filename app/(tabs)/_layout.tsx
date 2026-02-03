import { Tabs } from "expo-router";
import "react-native-reanimated";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from "react-native-google-mobile-ads";

import { useTheme } from "../../lib/ThemeContext"; // adjust path if needed

configureReanimatedLogger({ level: ReanimatedLogLevel.warn, strict: false });

export default function TabsLayout() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const HEADER_BG = "#1C2330";
  const INACTIVE = "rgba(255,255,255,0.65)";
  const ACTIVE = "#FFFFFF";

  // Your real banner unit id:
  const BANNER_UNIT_ID = "ca-app-pub-7166427778546018/2888339328";

  // Standard banner height is 50 on phones; add safe-area bottom so it’s not clipped.
  const bannerHeight = 50 + insets.bottom;

  return (
    <View style={{ flex: 1 }}>
      {/* Tabs area (leave room for banner at the bottom) */}
      <View style={{ flex: 1, marginBottom: bannerHeight }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: HEADER_BG,
              borderTopColor: "rgba(255,255,255,0.10)",
              paddingBottom: 16,
              paddingTop: 2,
            },
            tabBarActiveTintColor: ACTIVE,
            tabBarInactiveTintColor: INACTIVE,
            tabBarLabelStyle: {
              fontWeight: "800",
              fontSize: 11,
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: "Home",
              tabBarIcon: ({ color, size, focused }) => (
                <Ionicons
                  name={focused ? "home" : "home-outline"}
                  size={size}
                  color={color}
                />
              ),
            }}
          />

          <Tabs.Screen
            name="friends"
            options={{
              title: "Friends",
              tabBarIcon: ({ color, size, focused }) => (
                <Ionicons
                  name={focused ? "people" : "people-outline"}
                  size={size}
                  color={color}
                />
              ),
            }}
          />

          <Tabs.Screen
            name="notifications"
            options={{
              title: "Inbox",
              tabBarIcon: ({ color, size, focused }) => (
                <Ionicons
                  name={focused ? "notifications" : "notifications-outline"}
                  size={size}
                  color={color}
                />
              ),
            }}
          />

          <Tabs.Screen
            name="profile"
            options={{
              title: "Me",
              tabBarIcon: ({ color, size, focused }) => (
                <Ionicons
                  name={focused ? "person" : "person-outline"}
                  size={size}
                  color={color}
                />
              ),
            }}
          />

          <Tabs.Screen
            name="game/[id]"
            options={{
              href: null,
              tabBarItemStyle: { display: "none" },
            }}
          />
        </Tabs>
      </View>

      {/* Fixed banner at bottom */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: insets.bottom,
          alignItems: "center",
        }}
      >
        <BannerAd
          unitId={__DEV__ ? TestIds.BANNER : BANNER_UNIT_ID}
          size={BannerAdSize.BANNER}
        />
      </View>
    </View>
  );
}
