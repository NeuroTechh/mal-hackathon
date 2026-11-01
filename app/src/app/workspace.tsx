import { UpcomingTimes, ScheduleSlot } from "../components/UpcomingTimes";
import { HospitalPhotosEditor } from "../components/HospitalPhotosEditor";
import { useApiQuery, prefetchApi } from "../lib/queries";
import { Skeleton } from "../components/Skeleton";
import { BookingRules, WeeklySchedule } from "../components/BookingRules";
import {
  Input as TextInput,
  Action,
  Card,
  Copy,
  Notice,
  Page,
  Title,
  s,
  time,
  Grid,
  Row,
  Status,
} from "../components/ui";
import { useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { Appointment, command, Doctor } from "../lib/api";
import { useDemo } from "../lib/demo";
type WorkspaceData = {
  policy: {
    lead_hours: number;
    window_days: number;
    cancellation_hours: number;
  };
  weekly: { days: number[]; start: string; end: string };
  doctors: (Doctor & { active: boolean })[];
  visits: Appointment[];
  slots: ScheduleSlot[];
};
export default function Workspace() {
  const { role } = useDemo();
  const details = useApiQuery<WorkspaceData>("/workspace");
  const data = details.data;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [fee, setFee] = useState("800");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("10:00");
  const load = details.refetch;
  async function send(path: string, body = {}) {
    setBusy(true);
    setError("");
    try {
      await command(path, body)();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page wide>
      <Title>
        {role === "hospital" ? "Hospital workspace" : "Your schedule"}
      </Title>
      <Row>
        <Action
          title="Switch role"
          secondary
          onPress={() => router.push("/account")}
        />
        {role === "hospital" && (
          <>
            <Action
              title="Request inbox"
              secondary
              onPress={() => router.push("/clinic")}
            />
            <Action
              title="Patient check-in"
              onPress={() => router.push("/scanner")}
            />
          </>
        )}
      </Row>
      <Notice text={error || details.error?.message || ""} />
      {details.isPending && <Skeleton count={2} />}
      <Text style={s.heading}>Visits</Text>
      {data?.visits.length === 0 && (
        <Card>
          <Copy>No visits scheduled yet.</Copy>
        </Card>
      )}
      <Grid>
        {data?.visits.map((a) => (
          <Card key={a.id}>
            <Status value={a.status} />
            <Text style={s.heading}>{a.doctor_name}</Text>
            <Copy>{time(a.starts_at)}</Copy>
            <Action
              title="View visit"
              secondary
              onPress={() => {
                void prefetchApi(`/visits/${a.id}`);
                router.push({ pathname: "/visit/[id]", params: { id: a.id } });
              }}
            />
          </Card>
        ))}
      </Grid>
      {role === "hospital" ? (
        <>
          <Text style={s.heading}>Manage doctors</Text>
          <Grid>
            <Card>
              <Text style={s.heading}>Add doctor</Text>
              <TextInput
                style={s.input}
                placeholder="Doctor name"
                value={name}
                onChangeText={setName}
              />
              <TextInput
                style={s.input}
                placeholder="Specialty"
                value={specialty}
                onChangeText={setSpecialty}
              />
              <TextInput
                style={s.input}
                placeholder="Fee in rupees"
                keyboardType="numeric"
                value={fee}
                onChangeText={setFee}
              />
              <Action
                title="Add doctor"
                disabled={busy || !name || !specialty}
                onPress={() =>
                  void send("/manage/doctors", {
                    name,
                    specialty,
                    fee: Number(fee),
                  })
                }
              />
            </Card>
            {data?.doctors.map((d) => (
              <Card key={d.id}>
                <Text style={s.heading}>{d.name}</Text>
                <Copy>
                  {d.specialty} · {d.active ? "Listed" : "Hidden"}
                </Copy>
                <Action
                  title={d.active ? "Hide from search" : "List in search"}
                  secondary
                  disabled={busy}
                  onPress={() => void send(`/manage/doctors/${d.id}/toggle`)}
                />
              </Card>
            ))}
          </Grid>
          {data && <BookingRules policy={data.policy} />}
          <HospitalPhotosEditor />
        </>
      ) : (
        <>
          {data && <UpcomingTimes slots={data.slots} onToggle={(id) => send(`/manage/slots/${id}/toggle`)} />}
          <Text style={s.heading}>Availability</Text>
          <Grid minWidth={360}>
            {data && (
              <WeeklySchedule
                schedule={data.weekly}
                onSaved={() => void load()}
              />
            )}
            <Card>
              <Text style={s.heading}>Add an available time</Text>
              <Copy>
                Clinic time zone: Asia/Kolkata. Visits last 30 minutes.
              </Copy>
              <TextInput
                style={s.input}
                placeholder="Date YYYY-MM-DD"
                value={date}
                onChangeText={setDate}
              />
              <TextInput
                style={s.input}
                placeholder="Start HH:MM"
                value={start}
                onChangeText={setStart}
              />
              <Action
                title="Add time"
                disabled={
                  busy ||
                  !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
                  !/^\d{2}:\d{2}$/.test(start)
                }
                onPress={() => {
                  const t = new Date(`${date}T${start}:00+05:30`);
                  if (Number.isNaN(t.getTime())) {
                    setError("Enter a valid date and time");
                    return;
                  }
                  void send("/manage/slots", {
                    startsAt: t.toISOString(),
                    endsAt: new Date(t.getTime() + 1800000).toISOString(),
                  });
                }}
              />
            </Card>
          </Grid>

        </>
      )}
    </Page>
  );
}
