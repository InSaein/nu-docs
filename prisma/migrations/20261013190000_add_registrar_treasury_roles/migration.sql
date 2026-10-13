BEGIN;

ALTER TYPE "UserRole" RENAME TO "UserRole_old";

CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'REGISTRAR', 'TREASURY');

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "UserRole"
  USING (
    CASE
      WHEN "role"::text = 'ADMIN' THEN 'REGISTRAR'
      ELSE "role"::text
    END
  )::"UserRole";

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'STUDENT';

DROP TYPE "UserRole_old";

COMMIT;
