import { Tabs } from "expo-router";
import "react-native-reanimated";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Constants from "expo-constants";

import { useTheme } from "../../lib/ThemeContext";

configureReanimatedLogger({ level: ReanimatedLogLevel.warn, strict: false });

const isExpoGo = Constants.appOwnership === "expo";

let BannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;

if (!isExpoGo) {
  try {
    const ads = require("react-native-google-mobile-ads");
    BannerAd = ads.BannerAd;
    BannerAdSize = ads.BannerAdSize;
    TestIds = ads.TestIds;
  } catch {}
}

export default function TabsLayout() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const HEADER_BG = "#1C2330";
  const INACTIVE = "rgba(255,255,255,0.65)";
  const ACTIVE = "#FFFFFF";

  const BANNER_UNIT_ID = "ca-app-pub-7166427778546018/2888339328";

  // Reserve ONLY the banner height in the content area.
  const bannerHeight = BannerAd ? 50 : 0;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <View style={{ flex: 1, marginBottom: bannerHeight }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: HEADER_BG,
              borderTopColor: "rgba(255,255,255,0.10)",

              // KEY: don't paint the safe-area as tab bar background
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

      {BannerAd ? (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            // Keep the ad above the home indicator
            bottom: insets.bottom,
            height: 50,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <BannerAd
            unitId={__DEV__ ? TestIds.BANNER : BANNER_UNIT_ID}
            size={BannerAdSize.BANNER}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}
