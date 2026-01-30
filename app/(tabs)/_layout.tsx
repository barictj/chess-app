import { Tabs } from "expo-router";
import "react-native-reanimated";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../lib/ThemeContext"; // adjust path if needed

configureReanimatedLogger({ level: ReanimatedLogLevel.warn, strict: false });

export default function TabsLayout() {
  const { theme } = useTheme();

  const HEADER_BG = "#1C2330"; // CWF-ish dark blue
  const INACTIVE = "rgba(255,255,255,0.65)";
  const ACTIVE = "#FFFFFF";

  return (
    <Tabs
      screenOptions={{
        headerShown: false, // we’re doing per-site header ourselves
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
          href: null, // ✅ removes tab button
          tabBarItemStyle: { display: "none" }, // just in case
        }}
      />
    </Tabs>
  );
}
