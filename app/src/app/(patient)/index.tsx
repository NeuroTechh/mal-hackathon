import { hospitalImages, warmHospitalImages } from "../../lib/hospital-images";
import { HospitalPhoto } from "../../components/HospitalPhoto";
import { useApiQuery, prefetchApi, prepareDoctor } from "../../lib/queries";
import { Skeleton } from "../../components/Skeleton";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SegmentedButtons, TextInput } from "react-native-paper";
import { router } from "expo-router";
import { Doctor, Hospital } from "../../lib/api";
import {
  Action,
  Card,
  CardLink,
  Choice,
  Copy,
  Grid,
  Input,
  Notice,
  Page,
  Title,
  colors,
  s,
} from "../../components/ui";
export default function Discover() {
  const [mode, setMode] = useState<"hospital" | "doctor">("hospital");
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 200);
    return () => clearTimeout(timer);
  }, [query]);
  const path = `/${mode === "hospital" ? "hospitals" : "doctors"}${debounced ? `?q=${encodeURIComponent(debounced)}` : ""}`;
  const results = useApiQuery<(Hospital | Doctor)[]>(path);
  const hospitals =
    mode === "hospital" ? ((results.data ?? []) as Hospital[]) : [];
  const doctors = mode === "doctor" ? ((results.data ?? []) as Doctor[]) : [];
  useEffect(() => {
    if (!results.data) return;
    if (mode === "hospital") {
      for (const h of (results.data as Hospital[]).slice(0, 3)) {
        warmHospitalImages(h);
        void prefetchApi(`/hospitals/${h.id}`);
      }
    } else {
      for (const d of (results.data as Doctor[]).slice(0, 2)) prepareDoctor(d);
    }
  }, [results.data, mode]);
  const error = results.error?.message ?? "";
  const loading = results.isPending;
  const specialties = Array.from(
    new Set(
      mode === "hospital"
        ? hospitals.flatMap((h) => h.specialties)
        : doctors.map((d) => d.specialty),
    ),
  ).sort();
  const hs = hospitals.filter(
    (h) => !specialty || h.specialties.includes(specialty),
  );
  const ds = doctors.filter((d) => !specialty || d.specialty === specialty);
  return (
    <Page wide>
      <Title>Book an appointment</Title>
      <Input
        placeholder="Hospital, doctor or specialty"
        label=""
        left={<TextInput.Icon icon="magnify" accessibilityLabel="Search" />}
        right={query ? <TextInput.Icon icon="close" accessibilityLabel="Clear search" onPress={() => setQuery("")} /> : undefined}
        value={query}
        onChangeText={setQuery}
        accessibilityLabel="Search hospitals and doctors"
        returnKeyType="search"
      />
      <View style={{ maxWidth: 420, width: "100%" }}>
        <SegmentedButtons
          theme={{ roundness: 2 }}
          value={mode}
          onValueChange={(value) => {
            setMode(value as "hospital" | "doctor");
            setSpecialty("");
          }}
          buttons={[
            { value: "hospital", label: "Hospitals", showSelectedCheck: false, checkedColor: colors.primary, style: { borderColor: colors.line, backgroundColor: mode === "hospital" ? "#FFF1F2" : "white" } },
            { value: "doctor", label: "Doctors", showSelectedCheck: false, checkedColor: colors.primary, style: { borderColor: colors.line, backgroundColor: mode === "doctor" ? "#FFF1F2" : "white" } },
          ]}
        />
      </View>
      {specialties.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 2 }}
        >
          <Choice
            title="All specialties"
            selected={!specialty}
            onPress={() => setSpecialty("")}
          />
          {specialties.map((value) => (
            <Choice
              key={value}
              title={value}
              selected={specialty === value}
              onPress={() => setSpecialty(value)}
            />
          ))}
        </ScrollView>
      )}
      <Notice text={error} />
      {!!error && (
        <Action
          title="Try again"
          secondary
          onPress={() => void results.refetch()}
        />
      )}
      {loading ? (
        <Skeleton />
      ) : (
        <>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={s.heading}>
              {mode === "hospital" ? "Hospitals" : "Doctors"}
            </Text>
            <Copy>{mode === "hospital" ? hs.length : ds.length} found</Copy>
          </View>
          {(mode === "hospital" ? hs : ds).length === 0 && !error && (
            <Card>
              <Text style={s.heading}>No matches</Text>
              <Copy>Try a different hospital, specialty or area.</Copy>
            </Card>
          )}
          <Grid>
            {mode === "hospital"
              ? hs.map((h) => (
                  <CardLink
                    key={h.id}
                    title={h.name}
                    cover={
                      <HospitalPhoto
                        photo={hospitalImages(h)[0]}
                        style={{
                          height: 180,
                        }}
                      />
                    }
                    subtitle={h.address || h.city}
                    prefetch={() => {
                      void prefetchApi(`/hospitals/${h.id}`);
                    }}
                    onPress={() => {
                      void prefetchApi(`/hospitals/${h.id}`);
                      router.push({
                        pathname: "/hospital/[id]",
                        params: { id: h.id },
                      });
                    }}
                  >
                    <Text style={s.copy} numberOfLines={2}>
                      {h.specialties.join(" · ") || "Consultations"}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                        borderTopWidth: 1,
                        borderColor: colors.line,
                        paddingTop: 10,
                      }}
                    >
                      <Copy>
                        {h.doctor_count}{" "}
                        {h.doctor_count === 1 ? "doctor" : "doctors"}
                      </Copy>
                      {h.min_fee !== null && (
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: colors.ink,
                          }}
                        >
                          From ₹{h.min_fee}
                        </Text>
                      )}
                    </View>
                  </CardLink>
                ))
              : ds.map((d) => (
                  <CardLink
                    key={d.id}
                    title={d.name}
                    subtitle={d.specialty}
                    prefetch={() => prepareDoctor(d)}
                    onPress={() => {
                      prepareDoctor(d);
                      router.push({
                        pathname: "/doctor/[id]",
                        params: { id: d.id },
                      });
                    }}
                  >
                    <Copy>
                      {d.clinic_name} · {d.city}
                    </Copy>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <Copy>{d.languages}</Copy>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: colors.ink,
                        }}
                      >
                        ₹{d.fee}
                      </Text>
                    </View>
                  </CardLink>
                ))}
          </Grid>
        </>
      )}
    </Page>
  );
}
