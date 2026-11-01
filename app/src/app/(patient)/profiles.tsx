import { useApiQuery } from "../../lib/queries";
import { Skeleton } from "../../components/Skeleton";
import {
  Input as TextInput,
  Action,
  Card,
  Copy,
  Notice,
  Page,
  s,
  Title,
  colors,
} from "../../components/ui";
import { View } from "react-native";
import { Text } from "react-native-paper";
import { useState } from "react";
import { command } from "../../lib/api";
export default function Profiles() {
  const details =
    useApiQuery<{ id: string; name: string; relationship: string }[]>(
      "/profiles",
    );
  const profiles = details.data ?? [];
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Page>
      <Notice text={error || details.error?.message || ""} />
      {details.isPending && <Skeleton count={1} />}
      {profiles.length > 0 && (
        <View>
          {profiles.map((p, index) => (
            <View key={p.id} style={{ paddingVertical: 16, gap: 4, borderBottomWidth: index < profiles.length - 1 ? 1 : 0, borderColor: colors.line }}>
              <Text selectable style={s.heading}>{p.name}</Text>
              <Copy>{p.relationship}</Copy>
            </View>
          ))}
        </View>
      )}
      <Title>Add family member</Title>
      <Card>
        <TextInput
          style={s.input}
          placeholder="Name"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={s.input}
          placeholder="Relationship, e.g. Parent"
          value={relationship}
          onChangeText={setRelationship}
        />
        <Action
          title="Add family member"
          loading={busy}
          disabled={!name.trim() || !relationship.trim()}
          onPress={() => {
            setError("");
            setBusy(true);
            void command<typeof profiles>("/profiles", { name, relationship })()
              .then(() => {
                void details.refetch();
                setName("");
                setRelationship("");
              })
              .catch(() => setError("Could not save profile"))
              .finally(() => setBusy(false));
          }}
        />
      </Card>
    </Page>
  );
}
