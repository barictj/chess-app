export default {
  expo: {
    name: "dotChess",
    slug: "chessapp",
    version: "1.0.5",
    runtimeVersion: "1.0.5",
    orientation: "portrait",
    icon: "./assets/images/logo.png",
    scheme: "dotChess",
    userInterfaceStyle: "automatic",

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.dotreduce.chessapp",
      usesAppleSignIn: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false, // 👈 ADD THIS
        NSCameraUsageDescription:
          "This app uses the camera for profile pictures.",
        NSPhotoLibraryUsageDescription:
          "This app needs access to your photo library for uploads.",
      },
    },
    android: {
      package: "com.dotreduce.chessapp",
      versionCode: 5,
      intentFilters: [
        {
          action: "VIEW",
          data: [{ scheme: "dotChess", host: "login" }],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      permissions: ["INTERNET", "ACCESS_NETWORK_STATE", "CAMERA"],
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },

    web: {
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",

      [
        "react-native-google-mobile-ads",
        {
          iosAppId: "ca-app-pub-7166427778546018~5446654671",
          androidAppId: "ca-app-pub-7166427778546018~3247140396", // add when you have it
        },
      ],

      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: { backgroundColor: "#000000" },
        },
      ],
      [
        "expo-build-properties",
        {
          ios: { useFrameworks: "static" },
          android: {
            compileSdkVersion: 36,
            targetSdkVersion: 36,
            gradleProperties: {
              "org.gradle.jvmargs": "-Xmx6g -XX:MaxMetaspaceSize=1g",
            },
          },
        },
      ],
      "expo-web-browser",
      "expo-secure-store",
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },

    updates: {
      url: "https://u.expo.dev/42242422-69e6-40eb-9519-30c56da02f5e",
      fallbackToCacheTimeout: 0,
    },

    assetBundlePatterns: ["**/*"],

    extra: {
      eas: {
        projectId: "42242422-69e6-40eb-9519-30c56da02f5e",
      },
    },
  },
};
