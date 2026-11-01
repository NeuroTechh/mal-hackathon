import { useApiQuery } from "../../lib/queries";
import { Skeleton } from "../../components/Skeleton";
import { useState } from "react";
import { Linking } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { command } from "../../lib/api";
import { apiUrl } from "../../lib/auth";
import {
  Action,
  Card,
  Copy,
  Notice,
  Page,
  Grid,
  Row,
  Choice,
} from "../../components/ui";
type Profile = { id: string; name: string };
type RecordFile = {
  id: string;
  name: string;
  profile_id: string | null;
  patient_name: string | null;
};
export default function Records() {
  const profilesQuery = useApiQuery<Profile[]>("/profiles");
  const profiles = profilesQuery.data ?? [];
  const [chosenProfile, setProfile] = useState("");
  const profile = chosenProfile || profiles[0]?.id || "";
  const recordsQuery = useApiQuery<RecordFile[]>("/records");
  const records = recordsQuery.data ?? [];
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = recordsQuery.refetch;
  async function upload() {
    setError("");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      if ((file.size ?? 0) > 5242880) {
        setError("Choose a file smaller than 5 MB.");
        return;
      }
      setBusy(true);
      const blob = await (await fetch(file.uri)).blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      await command("/records", {
        profileId: profile,
        name: file.name,
        mime: file.mimeType,
        base64,
      })();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload this file");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page wide>
      <Copy>
        Your records stay here across visits. Choose what to share when
        requesting an appointment.
      </Copy>
      <Notice
        text={
          error ||
          recordsQuery.error?.message ||
          profilesQuery.error?.message ||
          ""
        }
      />
      {(recordsQuery.isPending || profilesQuery.isPending) && (
        <Skeleton count={2} />
      )}
      <Row>
        {profiles.map((p) => (
          <Choice
            key={p.id}
            title={p.name}
            selected={profile === p.id}
            onPress={() => setProfile(p.id)}
          />
        ))}
      </Row>
      <Action
        title={busy ? "Uploading…" : "Upload record"}
        disabled={!profile || busy}
        onPress={() => void upload()}
      />
      <Copy>PDF, JPEG or PNG · Up to 5 MB</Copy>
      <Grid>
        {records
          .filter((r) => !r.profile_id || r.profile_id === profile)
          .map((r) => (
            <Card key={r.id}>
              <Copy>{r.name}</Copy>
              <Action
                title="Open"
                secondary
                onPress={() => {
                  void Linking.openURL(
                    `${apiUrl}/v1/records/${r.id}?demoRole=patient`,
                  ).catch(() => setError("Could not open file"));
                }}
              />
            </Card>
          ))}
      </Grid>
    </Page>
  );
}
