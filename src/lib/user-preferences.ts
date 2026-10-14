import type { PreferencePalette, ThemeMode } from "@prisma/client";

export type UserPreferences = {
  palette: PreferencePalette;
  themeMode: ThemeMode;
  largeText: boolean;
  reducedMotion: boolean;
};

export const defaultUserPreferences: UserPreferences = {
  palette: "NU_BLUE",
  themeMode: "SYSTEM",
  largeText: false,
  reducedMotion: false,
};

export const preferencePalettes = ["NU_BLUE", "EMERALD", "VIOLET", "AMBER"] as const;
export const themeModes = ["LIGHT", "DARK", "SYSTEM"] as const;

export function isPreferencePalette(value: unknown): value is PreferencePalette {
  return typeof value === "string" && preferencePalettes.includes(value as PreferencePalette);
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && themeModes.includes(value as ThemeMode);
}
