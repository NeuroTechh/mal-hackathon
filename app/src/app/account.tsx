import { prefetchApi } from "../lib/queries";
import { router } from "expo-router";
import { View } from "react-native";
import { CardLink, Copy, Grid, Page, Title } from "../components/ui";
import { selectRole, Role } from "../lib/demo";
const roles: {
  role: Role;
  title: string;
  description: string;
  action: string;
}[] = [
  {
    role: "patient",
    title: "Patient",
    description: "Appointments and health records for you and your family.",
    action: "Continue as patient",
  },
  {
    role: "hospital",
    title: "Hospital",
    description: "Appointment requests, doctors and patient check-in.",
    action: "Continue as hospital",
  },
  {
    role: "doctor",
    title: "Doctor",
    description: "Your schedule, consultations and patient notes.",
    action: "Continue as doctor",
  },
];
export default function Account() {
  function enter(role: Role) {
    selectRole(role);
    if (role === "patient") {
      void prefetchApi("/hospitals");
      void prefetchApi("/profiles");
    } else {
      void prefetchApi("/workspace");
      if (role === "hospital") void prefetchApi("/appointments?view=clinic");
    }
    router.replace(
      role === "patient" ? "/" : role === "hospital" ? "/clinic" : "/workspace",
    );
  }
  return (
    <Page wide>
      <View style={{ gap: 8, paddingBottom: 8 }}>
        <Title>Choose your role</Title>
        <Copy>Continue to your appointments and workspace.</Copy>
      </View>
      <Grid minWidth={260}>
        {roles.map((item) => (
          <CardLink
            key={item.role}
            title={item.title}
            subtitle={item.description}
            onPress={() => enter(item.role)}
          />
        ))}
      </Grid>
    </Page>
  );
}
