BEGIN;

CREATE TYPE "PreferencePalette" AS ENUM ('NU_BLUE', 'EMERALD', 'VIOLET', 'AMBER');
CREATE TYPE "ThemeMode" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

CREATE TABLE "UserPreferences" (
    "userId" TEXT NOT NULL,
    "palette" "PreferencePalette" NOT NULL DEFAULT 'NU_BLUE',
    "themeMode" "ThemeMode" NOT NULL DEFAULT 'SYSTEM',
    "largeText" BOOLEAN NOT NULL DEFAULT FALSE,
    "reducedMotion" BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "UserPreferences"
    ADD CONSTRAINT "UserPreferences_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "UserPreferences" ("userId", "updatedAt")
SELECT "id", CURRENT_TIMESTAMP
FROM "User";

COMMIT;
