"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type FormState = { error?: string };

export async function createUser(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const username = (formData.get("username") as string)?.trim();
  const password = formData.get("password") as string;
  const role = formData.get("role") as "ADMIN" | "USER";

  if (!username || !password) return { error: "Username and password are required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  try {
    const hash = await hashPassword(password);
    await prisma.user.create({ data: { username, password: hash, role: role === "ADMIN" ? "ADMIN" : "USER" } });
  } catch {
    return { error: "Username already exists." };
  }

  revalidatePath("/admin");
  return {};
}

export async function deleteUser(userId: number): Promise<FormState> {
  const me = await requireAdmin();
  if (me.id === userId) return { error: "Cannot delete your own account." };

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin");
  return {};
}

export async function changePassword(userId: number, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const password = formData.get("password") as string;
  if (!password || password.length < 8) return { error: "Password must be at least 8 characters." };

  const hash = await hashPassword(password);
  await prisma.user.update({ where: { id: userId }, data: { password: hash } });
  revalidatePath("/admin");
  return {};
}

export async function updateRole(userId: number, role: "ADMIN" | "USER"): Promise<FormState> {
  const me = await requireAdmin();
  if (me.id === userId) return { error: "Cannot change your own role." };

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin");
  return {};
}
