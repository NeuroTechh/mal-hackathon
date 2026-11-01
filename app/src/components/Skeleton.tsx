import { useEffect, useState } from "react";
import { Animated, Platform, View } from "react-native";
import { Card, Grid } from "./ui";
export function Skeleton({ count = 3 }: { count?: number }) {
  const [opacity] = useState(() => new Animated.Value(0.65));
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 850,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(opacity, {
          toValue: 0.65,
          duration: 850,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={{ width: "100%" }}
    >
      <Animated.View
        style={{ opacity }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Grid>
          {Array.from({ length: count }, (_, i) => (
            <Card key={i}>
              <View
                style={{
                  height: 18,
                  width: "65%",
                  borderRadius: 5,
                  backgroundColor: "#DFE2E6",
                }}
              />
              <View
                style={{
                  height: 12,
                  width: "42%",
                  borderRadius: 4,
                  backgroundColor: "#E7E9EC",
                }}
              />
              <View
                style={{
                  height: 12,
                  width: "88%",
                  borderRadius: 4,
                  backgroundColor: "#E7E9EC",
                }}
              />
              <View
                style={{
                  height: 36,
                  marginTop: 6,
                  borderRadius: 8,
                  backgroundColor: "#ECEEF1",
                }}
              />
            </Card>
          ))}
        </Grid>
      </Animated.View>
    </View>
  );
}
