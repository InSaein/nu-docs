import { prisma } from "@/lib/prisma";
import type { UserPreferences } from "@/lib/user-preferences";

export async function getOrCreateUserPreferences(userId: string): Promise<UserPreferences> {
  const preferences = await prisma.userPreferences.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: {
      palette: true,
      themeMode: true,
      largeText: true,
      reducedMotion: true,
    },
  });

  return preferences;
}
