import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Slot } from "../lib/api";
import { Action, Choice, Copy, Row, s } from "./ui";
import { colors, spacing } from "../theme";

export type ScheduleSlot = Slot & {
  blocked: boolean;
  booking_status?: "pending" | "confirmed" | null;
};
const timezone = "Asia/Kolkata";
const dayKey = (value: string) => new Date(value).toLocaleDateString("en-CA", { timeZone: timezone });
const clock = (value: string) => new Date(value).toLocaleTimeString("en-IN", { timeZone: timezone, hour: "numeric", minute: "2-digit" });

export function UpcomingTimes({ slots, onToggle }: {
  slots: ScheduleSlot[];
  onToggle: (id: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const upcoming = [...slots].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const days = [...new Set(upcoming.map((slot) => dayKey(slot.starts_at)))];
  const active = days.includes(selected) ? selected : days[0];
  const visible = upcoming.filter((slot) => dayKey(slot.starts_at) === active);
  return (
    <View style={{ gap: spacing.lg }}>
      <Text accessibilityRole="header" style={s.heading}>Upcoming times</Text>
      {!days.length ? <Copy>No upcoming times. Add availability above.</Copy> : <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {days.map((day) => {
            const slot = upcoming.find((item) => dayKey(item.starts_at) === day)!;
            return <Choice key={day} title={new Date(slot.starts_at).toLocaleDateString("en-IN", { timeZone: timezone, weekday: "short", day: "numeric", month: "short" })} selected={active === day} onPress={() => setSelected(day)} />;
          })}
        </ScrollView>
        <View>
          {visible.map((slot) => {
            const status = slot.booking_status === "confirmed" ? "Booked" : slot.booking_status === "pending" ? "Request pending" : slot.blocked ? "Blocked" : "Available";
            return <View key={slot.id} style={{ paddingVertical: spacing.md, borderBottomWidth: 1, borderColor: colors.line }}>
              <Row>
                <View style={{ flex: 1, minWidth: 150, gap: spacing.xs }}>
                  <Text style={[s.heading, { fontVariant: ["tabular-nums"] }]}>{clock(slot.starts_at)} – {clock(slot.ends_at)}</Text>
                  <Copy>{status}</Copy>
                </View>
                {!slot.booking_status && <Action title={slot.blocked ? "Unblock" : "Block"} text loading={saving === slot.id} disabled={saving !== null} onPress={() => {
                  setSaving(slot.id);
                  void onToggle(slot.id).finally(() => setSaving(null));
                }} />}
              </Row>
            </View>;
          })}
        </View>
      </>}
    </View>
  );
}
