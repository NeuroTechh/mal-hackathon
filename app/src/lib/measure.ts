import Constants from "expo-constants";
import { Platform } from "react-native";
let initialization: Promise<void> | undefined;
export function initializeMeasure(): Promise<void> {
  const enabled =
    Platform.OS === "android"
      ? Constants.expoConfig?.extra?.measureAndroidEnabled
      : Platform.OS === "ios" && Constants.expoConfig?.extra?.measureIosEnabled;
  if (!enabled) return Promise.resolve();
  initialization ??= (async () => {
    const { Measure, MeasureConfig } = await import("@measuresh/react-native");
    await Measure.init({ config: new MeasureConfig({}) });
  })();
  return initialization;
}
