import { router } from "expo-router";
import { View } from "react-native";
import AppointmentList from "../components/AppointmentList";
import { Action } from "../components/ui";
export default function Clinic() {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 22, paddingVertical: 10 }}>
        <Action
          title="Hospital workspace"
          secondary
          onPress={() => router.push("/workspace")}
        />
      </View>
      <AppointmentList clinic />
    </View>
  );
}
