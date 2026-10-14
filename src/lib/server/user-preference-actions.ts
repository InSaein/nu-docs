"use server";

import { PreferencePalette, ThemeMode } from "@prisma/client";
import { requireAuthenticatedSession } from "@/lib/server/authorization";
import { prisma } from "@/lib/prisma";
import { isPreferencePalette, isThemeMode, type UserPreferences } from "@/lib/user-preferences";

type PreferenceKey = "palette" | "themeMode" | "largeText" | "reducedMotion";

export type UpdatePreferenceResult = {
  preferences?: UserPreferences;
  error?: string;
};

export async function updateUserPreference(key: unknown, value: unknown): Promise<UpdatePreferenceResult> {
  const session = await requireAuthenticatedSession();
  let preferences: UserPreferences;

  switch (key as PreferenceKey) {
    case "palette":
      if (!isPreferencePalette(value)) return { error: "Choose a supported color palette." };
      preferences = await upsertPreference(session.userId, {
        palette: value,
      });
      break;
    case "themeMode":
      if (!isThemeMode(value)) return { error: "Choose a supported theme mode." };
      preferences = await upsertPreference(session.userId, {
        themeMode: value,
      });
      break;
    case "largeText":
      if (typeof value !== "boolean") return { error: "Choose a valid text-size setting." };
      preferences = await upsertPreference(session.userId, {
        largeText: value,
      });
      break;
    case "reducedMotion":
      if (typeof value !== "boolean") return { error: "Choose a valid motion setting." };
      preferences = await upsertPreference(session.userId, {
        reducedMotion: value,
      });
      break;
    default:
      return { error: "Unsupported preference." };
  }

  return { preferences };
}

async function upsertPreference(
  userId: string,
  update: {
    palette?: PreferencePalette;
    themeMode?: ThemeMode;
    largeText?: boolean;
    reducedMotion?: boolean;
  },
): Promise<UserPreferences> {
  return prisma.userPreferences.upsert({
    where: { userId },
    create: { userId, ...update },
    update,
    select: {
      palette: true,
      themeMode: true,
      largeText: true,
      reducedMotion: true,
    },
  });
}
