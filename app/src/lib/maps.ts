import { Linking } from "react-native";
export function openHospitalMap(hospital: {
  name: string;
  city: string;
  address?: string;
  google_place_id?: string | null;
}) {
  const query = [hospital.name, hospital.address || hospital.city]
    .filter(Boolean)
    .join(", ");
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}${hospital.google_place_id ? `&query_place_id=${encodeURIComponent(hospital.google_place_id)}` : ""}`;
  return Linking.openURL(url);
}
