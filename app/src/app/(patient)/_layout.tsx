import { prefetchApi } from "../../lib/queries";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Redirect, Tabs, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "react-native-paper";
import { colors } from "../../components/ui";
import { useDemo } from "../../lib/demo";
export default function PatientTabs() {
  const { role } = useDemo();
  const insets = useSafeAreaInsets();
  if (role === "choose") return <Redirect href="/account" />;
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#FFFFFF" },
        headerTintColor: colors.ink,
        headerShadowVisible: false,
        headerTitleStyle: { fontSize: 18, fontWeight: "700" },
        headerRight: () => (
          <Button mode="text" compact onPress={() => router.push("/account")}>
            Switch role
          </Button>
        ),
        tabBarLabelPosition: "below-icon",
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        tabBarItemStyle: { paddingVertical: 5 },
        tabBarStyle: {
          backgroundColor: "white",
          borderTopColor: colors.line,
          height: 64 + insets.bottom,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "NeuroTechh",
          tabBarLabel: "Book",
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name="hospital-building"
              size={23}
              color={focused ? colors.primary : colors.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="appointments"
        listeners={{
          tabPress: () => {
            void prefetchApi("/appointments");
          },
        }}
        options={{
          title: "Your appointments",
          tabBarLabel: "Visits",
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name="calendar-check-outline"
              size={23}
              color={focused ? colors.primary : colors.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="records"
        listeners={{
          tabPress: () => {
            void prefetchApi("/records");
          },
        }}
        options={{
          title: "Health records",
          tabBarLabel: "Records",
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name="file-document-outline"
              size={23}
              color={focused ? colors.primary : colors.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profiles"
        listeners={{
          tabPress: () => {
            void prefetchApi("/profiles");
          },
        }}
        options={{
          title: "Your family",
          tabBarLabel: "Family",
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name="account-group-outline"
              size={23}
              color={focused ? colors.primary : colors.muted}
            />
          ),
        }}
      />
    </Tabs>
  );
}
