import { useApiQuery } from "../../lib/queries";
import { Skeleton } from "../../components/Skeleton";
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
  Status,
} from "../../components/ui";
import { useState } from "react";
import { Linking, Text, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import QRCode from "react-native-qrcode-svg";
import { api, Appointment, command, Slot } from "../../lib/api";
import { apiUrl } from "../../lib/auth";
import { useDemo } from "../../lib/demo";
type Visit = Appointment & {
  doctor_id: string;
  patient_name: string;
  notes: string;
  prescription: string;
  pass_token: string | null;
  checked_in_at: string | null;
  files: { id: string; name: string }[];
};
export default function VisitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { role } = useDemo();
  const { width } = useWindowDimensions();
  const details = useApiQuery<Visit>(`/visits/${id}`);
  const visit = details.data;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState("");
  const [prescription, setPrescription] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const load = details.refetch;
  async function send(action: string, body: object) {
    if (!visit) return;
    setBusy(true);
    try {
      await command(`/visits/${id}/${action}`, body, visit.version)();
      await load();
      setSlots([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }
  async function upload() {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png"],
        copyToCacheDirectory: true,
      });
      if (picked.canceled) return;
      const file = picked.assets[0];
      if ((file.size ?? 0) > 5 * 1024 * 1024) {
        setError("Maximum file size is 5 MB");
        return;
      }
      const blob = await (await fetch(file.uri)).blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      await send("files", { name: file.name, mime: file.mimeType, base64 });
    } catch {
      setError("Could not upload this file");
    }
  }
  return (
    <Page wide>
      <Title>Visit details</Title>
      <Notice text={error || details.error?.message || ""} />
      {details.isPending && <Skeleton count={2} />}
      {visit && (
        <Grid minWidth={340}>
          <Card>
            <Status value={visit.status} />
            <Text style={s.heading}>{visit.patient_name}</Text>
            <Copy>{time(visit.starts_at, visit.timezone)}</Copy>
            <Copy>
              {visit.checked_in_at ? "Patient checked in" : "Not checked in"}
            </Copy>
          </Card>
          {role === "patient" &&
            visit.status === "confirmed" &&
            visit.pass_token && (
              <Card>
                <Text style={s.heading}>Your entry pass</Text>
                <View style={{ alignItems: "center", paddingVertical: 12 }}>
                  <QRCode
                    value={visit.pass_token}
                    size={Math.min(210, width - 100)}
                  />
                </View>
                <Copy>
                  Show at the hospital. Valid within 24 hours of your visit.
                </Copy>
                <Text
                  selectable
                  style={{ fontSize: 12, color: "#59697C", flexShrink: 1 }}
                >
                  {visit.pass_token}
                </Text>
                <Action
                  title="Request another time"
                  secondary
                  disabled={busy}
                  onPress={() => {
                    void api<Slot[]>(`/doctors/${visit.doctor_id}/slots`)
                      .then(setSlots)
                      .catch(() => setError("Could not load times"));
                  }}
                />
                {slots.map((slot) => (
                  <Action
                    key={slot.id}
                    title={time(slot.starts_at)}
                    secondary
                    disabled={busy}
                    onPress={() => void send("reschedule", { slotId: slot.id })}
                  />
                ))}
                <Copy>
                  Your current visit stays confirmed until the new time is
                  approved.
                </Copy>
              </Card>
            )}
          {role === "hospital" && visit.status === "confirmed" && (
            <Card>
              <Text style={s.heading}>Reschedule visit</Text>
              <Action
                title="Choose another time"
                secondary
                onPress={() => {
                  void api<Slot[]>(`/doctors/${visit.doctor_id}/slots`)
                    .then(setSlots)
                    .catch(() => setError("Could not load times"));
                }}
              />
              {slots.map((slot) => (
                <Action
                  key={slot.id}
                  title={time(slot.starts_at)}
                  secondary
                  disabled={busy}
                  onPress={() => void send("reschedule", { slotId: slot.id })}
                />
              ))}
            </Card>
          )}
          <Card>
            <Text style={s.heading}>Shared records</Text>
            <Copy>
              Files attached here are shared with this hospital and the treating
              doctor for this visit.
            </Copy>
            {visit.files.map((file) => (
              <Action
                key={file.id}
                title={file.name}
                secondary
                onPress={() => {
                  void Linking.openURL(
                    `${apiUrl}/v1/visits/${id}/files/${file.id}?demoRole=${role}`,
                  ).catch(() => setError("Could not open file"));
                }}
              />
            ))}
            {role === "patient" &&
              ["pending", "confirmed"].includes(visit.status) && (
                <Action
                  title={busy ? "Uploading…" : "Attach PDF or image"}
                  disabled={busy}
                  onPress={() => void upload()}
                />
              )}
          </Card>
          {role === "doctor" && visit.status === "confirmed" && (
            <Card>
              <Text style={s.heading}>Complete consultation</Text>
              <TextInput
                style={s.input}
                multiline
                placeholder="Visit notes"
                value={notes}
                onChangeText={setNotes}
              />
              <TextInput
                style={s.input}
                multiline
                placeholder="Prescription / advice"
                value={prescription}
                onChangeText={setPrescription}
              />
              <Action
                title="Save and complete visit"
                disabled={busy || !notes.trim()}
                onPress={() => void send("complete", { notes, prescription })}
              />
            </Card>
          )}
          {visit.status === "completed" && (
            <Card>
              <Text style={s.heading}>Consultation summary</Text>
              <Copy>{visit.notes}</Copy>
              <Copy>{visit.prescription || "No prescription added."}</Copy>
            </Card>
          )}
        </Grid>
      )}
    </Page>
  );
}
