import { hospitalImages, warmHospitalImages } from "../../lib/hospital-images";
import { HospitalPhoto } from "../../components/HospitalPhoto";
import { useApiQuery, prepareDoctor } from "../../lib/queries";
import { Skeleton } from "../../components/Skeleton";
import { useEffect, useState } from "react";
import { Text, ScrollView, useWindowDimensions } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Doctor, Hospital } from "../../lib/api";
import { openHospitalMap } from "../../lib/maps";
import {
  Action,
  Card,
  CardLink,
  Copy,
  Grid,
  Notice,
  Page,
  Row,
  Title,
  s,
} from "../../components/ui";
export default function HospitalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const details = useApiQuery<{ hospital: Hospital; doctors: Doctor[] }>(
    `/hospitals/${id}`,
  );
  const data = details.data;
  const { width } = useWindowDimensions();
  useEffect(() => {
    if (data) warmHospitalImages(data.hospital);
  }, [data]);
  const [mapError, setMapError] = useState("");
  const error = details.error?.message ?? mapError;
  const load = () => {
    void details.refetch();
  };
  return (
    <Page wide>
      <Title>{data?.hospital.name ?? "Hospital"}</Title>
      <Notice text={error} />
      {!data && error ? (
        <Action title="Retry" onPress={load} />
      ) : !data ? (
        <Skeleton count={2} />
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            {hospitalImages(data.hospital).map((photo) => (
              <HospitalPhoto
                key={photo.key}
                photo={photo}
                style={{
                  width: Math.min(500, width - 54),
                  height: Math.min(300, (width - 54) * 0.65),
                  borderRadius: 12,
                }}
              />
            ))}
          </ScrollView>
          <Copy>{data.hospital.address || data.hospital.city}</Copy>
          <Row>
            <Action
              title="Directions"
              text
              icon="map-marker-outline"
              onPress={() => {
                void openHospitalMap(data.hospital).catch(() =>
                  setMapError("Could not open Google Maps"),
                );
              }}
            />
          </Row>
          <Text style={s.heading}>Choose a doctor</Text>
          {data.doctors.length === 0 ? (
            <Card>
              <Copy>No doctors are currently available at this hospital.</Copy>
            </Card>
          ) : (
            <Grid>
              {data.doctors.map((d) => (
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
                  <Copy>{d.languages}</Copy>
                  <Text style={s.heading}>₹{d.fee}</Text>
                </CardLink>
              ))}
            </Grid>
          )}
        </>
      )}
    </Page>
  );
}
