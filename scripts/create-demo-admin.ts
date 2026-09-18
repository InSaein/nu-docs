import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "@prisma/client";

async function main() {
  const studentNumber = process.env.DEMO_ADMIN_STUDENT_NUMBER;
  const name = process.env.DEMO_ADMIN_NAME;
  const email = process.env.DEMO_ADMIN_EMAIL;
  const password = process.env.DEMO_ADMIN_PASSWORD;

  if (!studentNumber || !name || !email || !password) {
    throw new Error("DEMO_ADMIN_STUDENT_NUMBER, DEMO_ADMIN_NAME, DEMO_ADMIN_EMAIL, and DEMO_ADMIN_PASSWORD are required.");
  }

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.upsert({
      where: { studentNumber },
      create: {
        studentNumber,
        name,
        email,
        password: passwordHash,
        role: UserRole.ADMIN,
      },
      update: {
        name,
        email,
        password: passwordHash,
        role: UserRole.ADMIN,
      },
    });

    console.log(`Demo admin is ready: ${studentNumber} (${email})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Failed to create demo admin.");
  process.exit(1);
});