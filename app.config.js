export default {
  expo: {
    name: "dotChess",
    slug: "chessapp2",
    version: "1.0.22",
    runtimeVersion: "1.0.22",
    orientation: "portrait",
    icon: "./assets/images/logo.png",
    scheme: "dotchess",
    userInterfaceStyle: "automatic",

    ios: {
      supportsTablet: false,
      appleTeamId: "97L92C7YW7",
      bundleIdentifier: "com.dotreduce.chessapp.ios",
      usesAppleSignIn: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription:
          "This app uses the camera for profile pictures.",
        NSPhotoLibraryUsageDescription:
          "This app needs access to your photo library for uploads.",
      },
    },

    android: {
      package: "com.dotreduce.chessapp",
      intentFilters: [
        {
          action: "VIEW",
          data: [{ scheme: "dotchess", host: "login" }],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      permissions: [
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "CAMERA",
        "com.google.android.gms.permission.AD_ID",
      ],
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },

    web: {
      favicon: "./assets/images/favicon.png",
    },

    plugins: [
      "expo-router",
      "./plugins/withPhoneOnlyAndroid",
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
      url: "https://u.expo.dev/bd61f132-2f81-4d24-b00e-2b50274c5c5b",
      fallbackToCacheTimeout: 0,
    },

    assetBundlePatterns: ["**/*"],

    extra: {
      eas: {
        projectId: "bd61f132-2f81-4d24-b00e-2b50274c5c5b",
      },
      router: {},
    },
    owner: "barictj",
  },
};
