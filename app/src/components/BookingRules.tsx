import { useState } from "react";
import { Text, View } from "react-native";
import { command } from "../lib/api";
import { Action, Card, Input, Notice, s, Row, Grid, Choice } from "./ui";
export function BookingRules({
  policy,
}: {
  policy: {
    lead_hours: number;
    window_days: number;
    cancellation_hours: number;
  };
}) {
  const [lead, setLead] = useState(String(policy.lead_hours));
  const [window, setWindow] = useState(String(policy.window_days));
  const [cutoff, setCutoff] = useState(String(policy.cancellation_hours));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Card>
      <Text style={s.heading}>Booking rules</Text>
      <Grid minWidth={220}>
        <Input
          label="Minimum notice (hours)"
          value={lead}
          onChangeText={setLead}
          keyboardType="numeric"
        />
        <Input
          label="Book ahead (days)"
          value={window}
          onChangeText={setWindow}
          keyboardType="numeric"
        />
        <Input
          label="Cancel before visit (hours)"
          value={cutoff}
          onChangeText={setCutoff}
          keyboardType="numeric"
        />
      </Grid>
      <Notice text={message} />
      <Action
        title="Save rules"
        loading={busy}
        onPress={() => {
          setBusy(true);
          void command("/manage/policy", {
            leadHours: Number(lead),
            windowDays: Number(window),
            cancellationHours: Number(cutoff),
          })()
            .then(() => setMessage("Booking rules saved."))
            .catch((e) => setMessage(e.message))
            .finally(() => setBusy(false));
        }}
      />
    </Card>
  );
}
export function WeeklySchedule({
  schedule,
  onSaved,
}: {
  schedule: { days: number[]; start: string; end: string };
  onSaved: () => void;
}) {
  const [days, setDays] = useState(schedule.days);
  const [start, setStart] = useState(schedule.start);
  const [end, setEnd] = useState(schedule.end);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Card>
      <Text style={s.heading}>Weekly availability</Text>
      <Row>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
          <Choice
            key={day}
            title={day}
            selected={days.includes(i)}
            onPress={() =>
              setDays((old) =>
                old.includes(i) ? old.filter((d) => d !== i) : [...old, i],
              )
            }
          />
        ))}
      </Row>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Input label="From (HH:MM)" value={start} onChangeText={setStart} />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="Until (HH:MM)" value={end} onChangeText={setEnd} />
        </View>
      </View>
      <Notice text={message} />
      <Action
        title="Save weekly hours"
        loading={busy}
        onPress={() => {
          setBusy(true);
          void command("/manage/weekly", { days, start, end })()
            .then(() => {
              setMessage("Availability saved for the next 30 days.");
              onSaved();
            })
            .catch((e) => setMessage(e.message))
            .finally(() => setBusy(false));
        }}
      />
    </Card>
  );
}
