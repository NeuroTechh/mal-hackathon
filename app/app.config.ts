import type { ConfigContext, ExpoConfig } from "expo/config";
export default ({ config }: ConfigContext): ExpoConfig => {
  const androidEnabled = Boolean(
    process.env.MEASURE_ANDROID_API_KEY && process.env.MEASURE_ANDROID_API_URL,
  );
  const iosEnabled = Boolean(
    process.env.MEASURE_IOS_API_KEY && process.env.MEASURE_IOS_API_URL,
  );
  return {
    ...config,
    name: "NeuroTechh",
    slug: "hackathon",
    scheme: "hackathon",
    android: { ...config.android, package: "com.hackathon.app" },
    ios: { ...config.ios, bundleIdentifier: "com.hackathon.app" },
    plugins: [
      "expo-secure-store",
      "expo-router",
      "expo-asset",
      [
        "expo-camera",
        {
          cameraPermission: "Scan patient entry passes",
          recordAudioAndroid: false,
        },
      ],
      "expo-web-browser",
      [
        "expo-build-properties",
        {
          android: {
            usesCleartextTraffic: process.env.APP_ENV !== "production",
          },
        },
      ],
      ...(androidEnabled || iosEnabled
        ? [
            [
              "@measuresh/react-native",
              {
                androidApiKey: process.env.MEASURE_ANDROID_API_KEY,
                androidApiUrl: process.env.MEASURE_ANDROID_API_URL,
                iosApiKey: process.env.MEASURE_IOS_API_KEY,
                iosApiUrl: process.env.MEASURE_IOS_API_URL,
              },
            ] as [string, Record<string, unknown>],
          ]
        : []),
    ],
    extra: {
      measureAndroidEnabled: androidEnabled,
      measureIosEnabled: iosEnabled,
    },
  };
};
