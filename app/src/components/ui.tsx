import type { ReactNode } from "react";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Children, ComponentProps, PropsWithChildren, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Button,
  Card as MaterialCard,
  Chip,
  Text,
  TextInput as MaterialInput,
} from "react-native-paper";

import { colors, spacing, radius, typography } from "../theme";
export { colors, materialTheme } from "../theme";

export function Input({
  style,
  ...props
}: ComponentProps<typeof MaterialInput>) {
  return (
    <MaterialInput
      mode="outlined"
      {...props}
      label={props.label ?? props.placeholder}
      style={[
        { backgroundColor: "white", padding: 0, borderWidth: 0, fontSize: typography.input },
        style,
      ]}
      outlineStyle={[{ borderRadius: radius.control }, props.outlineStyle]}
    />
  );
}
export function Page({
  children,
  wide = false,
  footer,
}: PropsWithChildren<{ wide?: boolean; footer?: ReactNode }>) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.paper }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, alignItems: "center" }}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View
          style={[
            s.page,
            {
              maxWidth: wide ? 1160 : 760,
              paddingHorizontal: width < 600 ? spacing.lg : spacing.page,
              paddingTop: width < 600 ? spacing.xl : spacing.page,
              paddingBottom: Math.max(32, insets.bottom + 20),
            },
          ]}
        >
          {children}
        </View>
      </ScrollView>
      {footer && (
        <View
          style={{
            backgroundColor: "white",
            borderTopWidth: 1,
            borderColor: colors.line,
            alignItems: "center",
            paddingBottom: Math.max(12, insets.bottom),
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 760,
              paddingHorizontal: spacing.lg,
              paddingTop: 12,
            }}
          >
            {footer}
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
export function Grid({
  children,
  minWidth = 300,
}: PropsWithChildren<{ minWidth?: number }>) {
  const [width, setWidth] = useState(0);
  const { fontScale } = useWindowDimensions();
  const columns = Math.max(
    1,
    Math.min(
      3,
      Math.floor((width + 16) / (minWidth * Math.max(1, fontScale / 1.2) + 16)),
    ),
  );
  const size = width > 0 ? (width - 16 * (columns - 1)) / columns : undefined;
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ flexDirection: "row", flexWrap: "wrap", gap: 16, width: "100%" }}
    >
      {Children.toArray(children).map((child, i) => (
        <View
          key={(child as { key?: string }).key ?? i}
          style={{ width: size ?? "100%", minWidth: 0 }}
        >
          {child}
        </View>
      ))}
    </View>
  );
}
export function Row({ children }: PropsWithChildren) {
  return <View style={s.row}>{children}</View>;
}
export function Card({
  children,
  onPress,
  label,
  onPressIn,
  cover,
}: PropsWithChildren<{
  onPress?: () => void;
  onPressIn?: () => void;
  label?: string;
  cover?: ReactNode;
}>) {
  return (
    <MaterialCard
      onPress={onPress}
      onPressIn={onPressIn}
      accessibilityLabel={label}
      accessibilityRole={onPress ? "button" : undefined}
      mode="outlined"
      style={{
        backgroundColor: "white",
        borderColor: colors.line,
        borderRadius: radius.card,
      }}
    >
      {cover && <View style={{ overflow: "hidden", borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card }}>{cover}</View>}
      <MaterialCard.Content style={{ gap: spacing.md, padding: spacing.lg }}>
        {children}
      </MaterialCard.Content>
    </MaterialCard>
  );
}
export function CardLink({
  title,
  subtitle,
  children,
  onPress,
  prefetch,
  cover,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  onPress: () => void;
  prefetch?: () => void;
  cover?: ReactNode;
}>) {
  return (
    <Card onPress={onPress} onPressIn={prefetch} label={title} cover={cover}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.heading}>{title}</Text>
          {subtitle && <Text style={s.copy}>{subtitle}</Text>}
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={23}
          color={colors.muted}
        />
      </View>
      {children}
    </Card>
  );
}
export function Title({ children }: PropsWithChildren) {
  const { width } = useWindowDimensions();
  return (
    <Text
      accessibilityRole="header"
      style={[
        s.title,
        {
          fontSize: width >= 900 ? 28 : 23,
          lineHeight: width >= 900 ? 36 : 30,
        },
      ]}
    >
      {children}
    </Text>
  );
}
export function Copy({ children }: PropsWithChildren) {
  return <Text selectable style={s.copy}>{children}</Text>;
}
export function Action({
  title,
  onPress,
  disabled = false,
  loading = false,
  secondary = false,
  text = false,
  icon,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  secondary?: boolean;
  text?: boolean;
  icon?: ComponentProps<typeof Button>["icon"];
}) {
  return (
    <Button
      icon={icon}
      mode={text ? "text" : secondary ? "outlined" : "contained"}
      disabled={disabled || loading}
      loading={loading}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={onPress}
      contentStyle={{ minHeight: 48 }}
      style={{ borderRadius: radius.control, borderColor: colors.line, flexShrink: 1 }}
      labelStyle={{
        fontSize: 13,
        fontWeight: "600",
        marginHorizontal: 16,
        marginVertical: 11,
      }}
    >
      {title}
    </Button>
  );
}
export function Choice({
  title,
  selected,
  onPress,
  disabled = false,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Chip
      selected={selected}
      showSelectedCheck={false}
      mode="outlined"
      disabled={disabled}
      onPress={onPress}
      accessibilityLabel={title}
      accessibilityState={{ selected, disabled }}
      style={{
        backgroundColor: selected ? "#FFF1F2" : "white",
        borderColor: selected ? colors.primary : colors.line,
        borderRadius: 9,
        minHeight: 48,
        maxWidth: "100%",
      }}
      textStyle={{
        fontSize: 13,
        color: selected ? "#B42332" : colors.ink,
        fontWeight: selected ? "600" : "400",
      }}
    >
      {title}
    </Chip>
  );
}
export function Status({ value }: { value: string }) {
  const tone =
    value === "confirmed" || value === "completed"
      ? ["#E9F6EF", "#176347"]
      : value === "pending"
        ? ["#FFF4DD", "#805900"]
        : ["#F0F2F5", "#686B71"];
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: tone[0],
        borderRadius: 6,
        paddingHorizontal: 9,
        paddingVertical: 5,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: tone[1],
          textTransform: "capitalize",
        }}
      >
        {value}
      </Text>
    </View>
  );
}
export function Notice({ text }: { text: string }) {
  return text ? (
    <Text selectable accessibilityRole="alert" style={s.notice}>
      {text}
    </Text>
  ) : null;
}
export const s = StyleSheet.create({
  page: { width: "100%", gap: 20 },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  title: { fontWeight: "700", color: colors.ink, letterSpacing: -0.6 },
  copy: { fontSize: 13, lineHeight: 20, color: colors.muted },
  heading: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "600",
    color: colors.ink,
  },
  input: { backgroundColor: "white", fontSize: 15 },
  badge: {
    color: colors.primary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  notice: { fontSize: 13, lineHeight: 20, color: "#8C3C1E" },
});
export function time(value: string, timezone = "Asia/Kolkata") {
  return new Date(value).toLocaleString("en-IN", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
