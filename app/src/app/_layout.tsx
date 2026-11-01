import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../lib/query-client";
import { PaperProvider } from "react-native-paper";
import { materialTheme, colors } from "../components/ui";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { initializeMeasure } from "../lib/measure";
export default function Layout() {
  useEffect(() => {
    void initializeMeasure().catch(() =>
      console.warn("Measure initialization failed"),
    );
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={materialTheme}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.paper },
            headerTintColor: colors.ink,
            headerShadowVisible: false,
            headerBackTitle: "Back",
            headerTitleStyle: { fontSize: 17, fontWeight: "600" },
          }}
        >
          <Stack.Screen name="(patient)" options={{ headerShown: false }} />
          <Stack.Screen name="hospital/[id]" options={{ title: "Hospital" }} />
          <Stack.Screen
            name="visit/[id]"
            options={{ title: "Visit details" }}
          />
          <Stack.Screen name="workspace" options={{ title: "Workspace" }} />
          <Stack.Screen name="scanner" options={{ title: "Check-in" }} />
          <Stack.Screen
            name="doctor/[id]"
            options={{ title: "Choose a visit" }}
          />
          <Stack.Screen name="clinic" options={{ title: "Clinic inbox" }} />
          <Stack.Screen name="account" options={{ title: "NeuroTechh" }} />
        </Stack>
      </PaperProvider>
    </QueryClientProvider>
  );
}
