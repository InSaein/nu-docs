import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "@prisma/client";

const demoRole = UserRole.TREASURY;

class ProvisioningError extends Error {}

function getErrorCode(error) {
  return typeof error === "object" && error !== null && "code" in error
    ? error.code
    : undefined;
}

async function main() {
  try {
    await import("dotenv/config");
  } catch {
    throw new ProvisioningError("Environment loading failed. Ensure dotenv is installed and the project environment can be loaded.");
  }

  const studentNumber = process.env.DEMO_TREASURY_STUDENT_NUMBER;
  const name = process.env.DEMO_TREASURY_NAME;
  const email = process.env.DEMO_TREASURY_EMAIL;
  const password = process.env.DEMO_TREASURY_PASSWORD;
  const missingVariables = [
    ["DEMO_TREASURY_STUDENT_NUMBER", studentNumber],
    ["DEMO_TREASURY_NAME", name],
    ["DEMO_TREASURY_EMAIL", email],
    ["DEMO_TREASURY_PASSWORD", password],
    ["DATABASE_URL", process.env.DATABASE_URL],
  ]
    .filter(([, value]) => !value)
    .map(([variable]) => variable);

  if (missingVariables.length) {
    throw new ProvisioningError(
      `Missing configuration: set ${missingVariables.join(", ")} in the project .env or process environment.`,
    );
  }

  if (process.env.ENABLE_DEMO_LOGIN !== "true") {
    throw new ProvisioningError("Demo login is disabled. Set ENABLE_DEMO_LOGIN=true in the development environment.");
  }
  if (process.env.NODE_ENV === "production") {
    throw new ProvisioningError("Treasury demo provisioning is disabled in production.");
  }

  const nameParts = name.trim().split(/\s+/);
  const profile = {
    studentNumber,
    name,
    firstName: nameParts[0] ?? null,
    middleName: nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : null,
    lastName: nameParts.length > 1 ? nameParts.at(-1) ?? null : null,
    course: null,
    email,
    password: await bcrypt.hash(password, 12),
  };
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    await prisma.$transaction(async (transaction) => {
      const existingByNumber = await transaction.user.findUnique({
        where: { studentNumber },
        select: { id: true, role: true },
      });
      if (existingByNumber && existingByNumber.role !== demoRole) {
        throw new ProvisioningError(
          "Role conflict: the configured Treasury demo identifier belongs to a non-Treasury account. No account was changed.",
        );
      }

      const existingByEmail = await transaction.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existingByEmail && existingByEmail.id !== existingByNumber?.id) {
        throw new ProvisioningError(
          "Email conflict: the configured Treasury demo email belongs to another account. No account was changed.",
        );
      }

      if (existingByNumber) {
        await transaction.user.update({
          where: { id: existingByNumber.id },
          data: profile,
        });
      } else {
        await transaction.user.create({
          data: {
            ...profile,
            role: demoRole,
          },
        });
      }
    }, { isolationLevel: "Serializable" });

    console.log(`Treasury demo account is ready: ${studentNumber}`);
  } catch (error) {
    if (error instanceof ProvisioningError) {
      throw error;
    }
    if (getErrorCode(error) === "P2002") {
      throw new ProvisioningError(
        "Identifier or email conflict: another account uses the configured Treasury demo details. No role was changed.",
      );
    }
    if (getErrorCode(error) === "P2034") {
      throw new ProvisioningError(
        "Database conflict: account data changed during provisioning. Review the identifier and email, then retry.",
      );
    }
    throw new ProvisioningError(
      "Database access failed. Check DATABASE_URL, database availability, and that the schema is up to date.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof ProvisioningError ? error.message : "Treasury demo provisioning failed.");
  process.exitCode = 1;
});
