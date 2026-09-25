import { prisma } from "@/lib/prisma";

const userProfileSelect = {
  id: true,
  studentNumber: true,
  name: true,
  firstName: true,
  middleName: true,
  lastName: true,
  course: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

export function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: userProfileSelect,
  });
}
