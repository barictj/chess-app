import { Tabs } from "expo-router";
import "react-native-reanimated";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../../lib/ThemeContext";

configureReanimatedLogger({ level: ReanimatedLogLevel.warn, strict: false });

export default function TabsLayout() {
  const { theme } = useTheme();

  const HEADER_BG = "#1C2330";
  const INACTIVE = "rgba(255,255,255,0.65)";
  const ACTIVE = "#FFFFFF";

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: HEADER_BG,
              borderTopColor: "rgba(255,255,255,0.10)",
              height: 56,
              paddingBottom: 0,
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
    </SafeAreaView>
  );
}
