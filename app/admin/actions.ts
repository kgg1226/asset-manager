"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type FormState = { error?: string };

export async function createUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireAdmin();

  const username = (formData.get("username") as string)?.trim();
  const password = formData.get("password") as string;
  const role = formData.get("role") as "ADMIN" | "USER";

  if (!username || !password) return { error: "Username and password are required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  // 정책(dev-022): ADMIN 권한 부여는 SUPER_ADMIN 만 가능. 일반 USER 생성은 ADMIN 도 가능.
  if (role === "ADMIN" && !me.isSuperAdmin) return { error: "ADMIN 권한 부여는 최고관리자(SUPER_ADMIN)만 가능합니다." };

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

  // 권한 계층 무결성(dev-022): SUPER_ADMIN 계정은 SUPER_ADMIN 만 삭제할 수 있다.
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { isSuperAdmin: true } });
  if (target?.isSuperAdmin && !me.isSuperAdmin) {
    return { error: "최고관리자(SUPER_ADMIN) 계정은 최고관리자만 삭제할 수 있습니다." };
  }

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
  // 정책(dev-022): 사용자 권한(role) 변경은 SUPER_ADMIN 전용.
  if (!me.isSuperAdmin) return { error: "사용자 권한 변경은 최고관리자(SUPER_ADMIN)만 가능합니다." };

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin");
  return {};
}
