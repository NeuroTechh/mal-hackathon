import { Image, ImageURISource } from "react-native";
import { Asset } from "expo-asset";
import { apiUrl } from "./auth";
import type { Hospital } from "./api";
const exterior = require("../../assets/hospitals/clinic-exterior.jpg");
const interior = require("../../assets/hospitals/clinic-interior.jpg");
export type HospitalImage = {
  key: string;
  source: number | ImageURISource;
  label: string;
};
export function hospitalImages(
  hospital: Pick<Hospital, "id"> & { photos?: Hospital["photos"] },
): HospitalImage[] {
  if (hospital.photos?.length)
    return hospital.photos.map((photo) => ({
      key: photo.id,
      source: { uri: apiUrl + photo.path },
      label: "Hospital photo",
    }));
  const samples = hospital.id.endsWith("2")
    ? [interior, exterior]
    : [exterior, interior];
  return samples.map((source, index) => ({
    key: `${hospital.id}-${index}`,
    source,
    label: index === 0 ? "Clinic view" : "Clinic gallery",
  }));
}
export function warmHospitalImages(
  hospital: Pick<Hospital, "id"> & { photos?: Hospital["photos"] },
) {
  for (const photo of hospitalImages(hospital).slice(0, 2)) {
    if (typeof photo.source === "number")
      void Asset.fromModule(photo.source)
        .downloadAsync()
        .catch(() => {});
    else if (
      !Array.isArray(photo.source) &&
      typeof photo.source === "object" &&
      photo.source.uri
    )
      void Image.prefetch(photo.source.uri).catch(() => {});
  }
}
