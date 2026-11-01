import { useState } from "react";
import { Image, View, StyleProp, ViewStyle } from "react-native";
import { HospitalImage } from "../lib/hospital-images";
export function HospitalPhoto({
  photo,
  style,
}: {
  photo: HospitalImage;
  style?: StyleProp<ViewStyle>;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <View
      style={[
        { height: 160, overflow: "hidden", backgroundColor: "#E9ECEF" },
        style,
      ]}
    >
      <Image
        source={photo.source}
        resizeMode="cover"
        accessibilityLabel={photo.label}
        style={{ width: "100%", height: "100%", opacity: loaded ? 1 : 0 }}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
    </View>
  );
}
