import { MD3LightTheme } from "react-native-paper";

export const colors = {
  ink: "#1C1C1C",
  muted: "#686B71",
  primary: "#E23744",
  paper: "#FAFAFA",
  line: "#ECEDEF",
};
export const materialTheme = {
  ...MD3LightTheme,
  roundness: 3,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    onPrimary: "#FFFFFF",
    primaryContainer: "#FFF1F2",
    onPrimaryContainer: "#B42332",
    background: colors.paper,
    surface: "#FFFFFF",
    surfaceVariant: "#F0F4F8",
    onSurface: colors.ink,
    onSurfaceVariant: colors.muted,
    outline: "#A8B5C4",
    outlineVariant: colors.line,
    secondaryContainer: "#FFF1F2",
  },
};
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, page: 32 };
export const radius = { control: 10, card: 16 };
export const typography = { body: 13, input: 15, heading: 16 };
