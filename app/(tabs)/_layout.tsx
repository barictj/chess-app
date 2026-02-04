import { Tabs } from "expo-router";
import "react-native-reanimated";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { View, Text } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";

import { useTheme } from "../../lib/ThemeContext";

configureReanimatedLogger({ level: ReanimatedLogLevel.warn, strict: false });

export default function TabsLayout() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const HEADER_BG = "#1C2330";
  const INACTIVE = "rgba(255,255,255,0.65)";
  const ACTIVE = "#FFFFFF";

  // ✅ prod unit id
  const BANNER_UNIT_ID = "ca-app-pub-7166427778546018/2888339328";

  // Banner is 50pt + bottom safe area
  const bannerHeight = 50 + insets.bottom;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* Push tabs content up so it doesn't sit under the banner */}
      <View style={{ flex: 1, marginBottom: bannerHeight }}>
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

      {/* Bottom banner ad */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: bannerHeight,
          alignItems: "center",
          justifyContent: "flex-start",
          paddingBottom: insets.bottom,
        }}
      >
        <View style={{ height: 50, justifyContent: "center" }}>
          <Text style={{ fontSize: 10, opacity: 0.6, textAlign: "center" }}>
            Ad
          </Text>

          <BannerAd unitId={BANNER_UNIT_ID} size={BannerAdSize.BANNER} />
        </View>
      </View>
    </SafeAreaView>
  );
}
