import { useApiQuery, prefetchApi } from "../lib/queries";
import { queryClient } from "../lib/query-client";
import { getRole, useDemo } from "../lib/demo";
import { Skeleton } from "./Skeleton";
import { useRef, useState } from "react";
import { Alert, Text } from "react-native";
import { router } from "expo-router";
import { Appointment, command } from "../lib/api";
import {
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
} from "./ui";
export default function AppointmentList({
  clinic = false,
}: {
  clinic?: boolean;
}) {
  const { data: session, isPending } = useDemo();
  const path = `/appointments${clinic ? "?view=clinic" : ""}`;
  const details = useApiQuery<Appointment[]>(path, 5000);
  const items = details.data ?? [];
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const commands = useRef(new Map<string, () => Promise<Appointment>>());
  const refresh = details.refetch;
  async function act(a: Appointment, action: string) {
    setBusy(true);
    try {
      const key = `${a.id}:${a.version}:${action}`;
      let run = commands.current.get(key);
      if (!run) {
        run = command<Appointment>(
          `/${action === "cancel" ? "appointments" : "requests"}/${a.id}/${action}`,
          {},
          a.version,
        );
        commands.current.set(key, run);
      }
      const updated = await run();
      queryClient.setQueryData<Appointment[]>([getRole(), path], (old) =>
        (old ?? []).map((item) =>
          item.id === updated.id && item.version <= updated.version
            ? updated
            : item,
        ),
      );
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update appointment");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page wide>
      <Title>{clinic ? "Request inbox" : "My appointments"}</Title>
      <Copy>
        {clinic
          ? "Approve one request to confirm the time. Other requests for that time will be declined."
          : "Track your upcoming visits and appointment requests."}
      </Copy>
      <Notice text={error || details.error?.message || ""} />
      {!session ? (
        <Action
          title={isPending ? "Loading…" : "Sign in"}
          disabled={isPending}
          onPress={() => router.push("/account")}
        />
      ) : (
        <>
          {details.isPending && <Skeleton count={2} />}
          {!details.isPending && !details.error && items.length === 0 && (
            <Card>
              <Copy>
                {clinic
                  ? "No requests for your clinics."
                  : "No appointments yet. Find a doctor to request your first visit."}
              </Copy>
            </Card>
          )}
          <Grid>
            {items.map((a) => (
              <Card key={a.id}>
                <Status value={a.status} />
                <Text style={s.heading}>{a.doctor_name}</Text>
                <Copy>{a.clinic_name}</Copy>
                <Action
                  title="View visit"
                  secondary
                  onPress={() => {
                    void prefetchApi(`/visits/${a.id}`);
                    router.push({
                      pathname: "/visit/[id]",
                      params: { id: a.id },
                    });
                  }}
                />
                <Copy>{time(a.starts_at, a.timezone)}</Copy>
                {clinic && a.status === "pending" ? (
                  <Row>
                    <Action
                      title="Confirm request"
                      disabled={busy}
                      onPress={() => void act(a, "confirm")}
                    />
                    <Action
                      title="Decline"
                      secondary
                      disabled={busy}
                      onPress={() => void act(a, "decline")}
                    />
                  </Row>
                ) : (
                  ["pending", "confirmed"].includes(a.status) && (
                    <Action
                      title={
                        a.status === "pending"
                          ? "Withdraw request"
                          : "Cancel appointment"
                      }
                      secondary
                      disabled={busy}
                      onPress={() =>
                        Alert.alert(
                          "Cancel this visit?",
                          "Your appointment will be cancelled.",
                          [
                            { text: "Keep visit", style: "cancel" },
                            {
                              text: "Cancel visit",
                              style: "destructive",
                              onPress: () => void act(a, "cancel"),
                            },
                          ],
                        )
                      }
                    />
                  )
                )}
              </Card>
            ))}
          </Grid>
        </>
      )}
    </Page>
  );
}
