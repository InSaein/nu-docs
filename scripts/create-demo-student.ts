import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "@prisma/client";

const studentNumber = process.env.DEMO_STUDENT_NUMBER;
const name = process.env.DEMO_STUDENT_NAME;
const email = process.env.DEMO_STUDENT_EMAIL;
const password = process.env.DEMO_STUDENT_PASSWORD;

if (!studentNumber || !name || !email || !password) {
  throw new Error("DEMO_STUDENT_NUMBER, DEMO_STUDENT_NAME, DEMO_STUDENT_EMAIL, and DEMO_STUDENT_PASSWORD are required.");
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
      role: UserRole.STUDENT,
    },
    update: {
      name,
      email,
      password: passwordHash,
      role: UserRole.STUDENT,
    },
  });

  console.log(`Demo student is ready: ${studentNumber} (${email})`);
} finally {
  await prisma.$disconnect();
}
