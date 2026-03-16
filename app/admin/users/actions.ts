"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type FormState = { error?: string; success?: string };

// ── Create user ──────────────────────────────────────────────────────────────
export async function createUser(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const username = (formData.get("username") as string)?.trim();
  const password = formData.get("password") as string;
  const role     = formData.get("role") as "ADMIN" | "USER";

  if (!username || !password)
    return { error: "Username and password are required." };
  if (password.length < 8)
    return { error: "Password must be at least 8 characters." };

  try {
    const hash = await hashPassword(password);
    await prisma.user.create({
      data: {
        username,
        password: hash,
        role: role === "ADMIN" ? "ADMIN" : "USER",
      },
    });
  } catch {
    return { error: "Username already exists." };
  }

  revalidatePath("/admin/users");
  return { success: "User created successfully." };
}

// ── Update user (role) ──────────────────────────────────────────────────────
export async function updateUser(
  userId: number,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const me = await requireAdmin();

  const role = formData.get("role") as "ADMIN" | "USER";

  if (me.id === userId && role !== "ADMIN")
    return { error: "Cannot remove your own admin privileges." };

  await prisma.user.update({
    where: { id: userId },
    data: { role: role === "ADMIN" ? "ADMIN" : "USER" },
  });

  revalidatePath("/admin/users");
  return { success: "Updated successfully." };
}

// ── Reset password ──────────────────────────────────────────────────────────
export async function changePassword(
  userId: number,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();

  const password = formData.get("password") as string;
  if (!password || password.length < 8)
    return { error: "Password must be at least 8 characters." };

  const hash = await hashPassword(password);
  await prisma.user.update({ where: { id: userId }, data: { password: hash } });

  revalidatePath("/admin/users");
  return { success: "Password changed successfully." };
}

// ── Toggle active/inactive ─────────────────────────────────────────────────
export async function toggleUserActive(
  userId: number,
  currentIsActive: boolean
): Promise<FormState> {
  const me = await requireAdmin();

  if (me.id === userId)
    return { error: "Cannot deactivate your own account." };

  await prisma.user.update({
    where: { id: userId },
    data:  { isActive: !currentIsActive },
  });

  if (currentIsActive) {
    await prisma.session.deleteMany({ where: { userId } });
  }

  revalidatePath("/admin/users");
  return {};
}

// ── Delete user ──────────────────────────────────────────────────────────────
export async function deleteUser(userId: number): Promise<FormState> {
  const me = await requireAdmin();

  if (me.id === userId)
    return { error: "Cannot delete your own account." };

  await prisma.user.delete({ where: { id: userId } });

  revalidatePath("/admin/users");
  return {};
}
