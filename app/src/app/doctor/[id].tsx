import { queryClient } from "../../lib/query-client";
import { prefetchApi , useApiQuery } from "../../lib/queries";
import { Skeleton } from "../../components/Skeleton";
import { useRef, useState } from "react";
import { Text, ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Appointment, command, Doctor, Slot } from "../../lib/api";
import { useDemo } from "../../lib/demo";
import {
  Action,
  Card,
  Copy,
  Notice,
  Page,
  Title,
  s,
  Row,
  Choice,
} from "../../components/ui";
export default function DoctorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: session, role } = useDemo();
  const profilesQuery =
    useApiQuery<{ id: string; name: string }[]>("/profiles");
  const profiles = profilesQuery.data ?? [];
  const recordsQuery =
    useApiQuery<{ id: string; name: string; profile_id: string | null }[]>(
      "/records",
    );
  const records = recordsQuery.data ?? [];
  const doctorQuery = useApiQuery<Doctor>(`/doctors/${id}`);
  const doctor = doctorQuery.data;
  const slotsQuery = useApiQuery<Slot[]>(`/doctors/${id}/slots`);
  const slots = slotsQuery.data ?? [];
  const [recordIds, setRecordIds] = useState<string[]>([]);
  const [chosenPatientName, setPatientName] = useState("");
  const patientName = chosenPatientName || profiles[0]?.name || "";
  const [selectedDay, setSelectedDay] = useState("");
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef<{
    slot: string;
    run: () => Promise<Appointment>;
  } | null>(null);
  async function request() {
    if (!session) {
      router.push("/account");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (pending.current?.slot !== selected + patientName + recordIds.join())
        pending.current = {
          slot: selected + patientName + recordIds.join(),
          run: command<Appointment>("/appointment-requests", {
            slotId: selected,
            patientName,
            recordIds,
          }),
        };
      const appointment = await pending.current.run();
      queryClient.setQueryData<Appointment[]>(
        [role, "/appointments"],
        (old) => [
          appointment,
          ...(old ?? []).filter((item) => item.id !== appointment.id),
        ],
      );
      void prefetchApi(`/visits/${appointment.id}`);
      pending.current = null;
      router.replace("/appointments");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }
  const dayFor = (value: string) =>
    new Date(value).toLocaleDateString("en-CA", {
      timeZone: doctor?.timezone ?? "Asia/Kolkata",
    });
  const days = Array.from(new Set(slots.map((slot) => dayFor(slot.starts_at))));
  const activeDay = selectedDay || days[0];
  return (
    <Page
      footer={
        <Action
          title={
            busy
              ? "Sending request…"
              : session
                ? "Request appointment"
                : "Sign in to request"
          }
          disabled={
            !selected || busy || slotsQuery.isPending || profilesQuery.isPending
          }
          onPress={() => void request()}
        />
      }
    >
      <Text style={s.badge}>{doctor?.specialty ?? "Appointment"}</Text>
      <Title>{doctor?.name ?? "Choose your time"}</Title>
      <Copy>
        {doctor?.clinic_name} · {doctor?.city}
      </Copy>
      <Text style={s.heading}>₹{doctor?.fee ?? "—"} consultation</Text>
      <Notice
        text={
          message ||
          doctorQuery.error?.message ||
          slotsQuery.error?.message ||
          profilesQuery.error?.message ||
          recordsQuery.error?.message ||
          ""
        }
      />
      {slotsQuery.isPending && <Skeleton count={1} />}
      {!slotsQuery.isPending && (
        <Card>
          <Text style={s.heading}>Choose a day</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
          >
            {days.map((day) => (
              <Choice
                key={day}
                title={new Date(day + "T12:00:00").toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
                selected={day === activeDay}
                onPress={() => {
                  setSelectedDay(day);
                  setSelected("");
                }}
              />
            ))}
          </ScrollView>
          <Text style={s.heading}>Available times</Text>
          <Row>
            {slots
              .filter((slot) => dayFor(slot.starts_at) === activeDay)
              .map((slot) => (
                <Choice
                  key={slot.id}
                  title={new Date(slot.starts_at).toLocaleTimeString("en-IN", {
                    timeZone: doctor?.timezone ?? "Asia/Kolkata",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  selected={selected === slot.id}
                  onPress={() => setSelected(slot.id)}
                />
              ))}
          </Row>
        </Card>
      )}
      <Text style={s.heading}>Patient</Text>
      <Row>
        {profiles.map((p) => (
          <Choice
            key={p.id}
            title={p.name}
            selected={patientName === p.name}
            onPress={() => {
              setPatientName(p.name);
              setRecordIds([]);
            }}
          />
        ))}
      </Row>
      <Copy>Attach records (optional)</Copy>
      {records
        .filter(
          (r) =>
            !r.profile_id ||
            profiles.find((p) => p.name === patientName)?.id === r.profile_id,
        )
        .map((r) => (
          <Action
            key={r.id}
            title={`${recordIds.includes(r.id) ? "Selected: " : ""}${r.name}`}
            secondary={!recordIds.includes(r.id)}
            onPress={() =>
              setRecordIds((old) =>
                old.includes(r.id)
                  ? old.filter((x) => x !== r.id)
                  : [...old, r.id],
              )
            }
          />
        ))}
      <Action
        title="Upload a record"
        text
        onPress={() => router.push("/records")}
      />
      {doctor &&
        !slotsQuery.isPending &&
        !slotsQuery.error &&
        slots.length === 0 && <Copy>No available times. Check back soon.</Copy>}
    </Page>
  );
}
