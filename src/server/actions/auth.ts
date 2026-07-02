"use server";

import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/validators";
import { signIn } from "@/auth";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "@/lib/constants";
import { failure, type ActionResult } from "./helpers";

export async function registerUser(values: unknown): Promise<ActionResult> {
  try {
    const data = registerSchema.parse(values);
    const email = data.email.toLowerCase();

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return { ok: false, error: "An account with this email already exists" };

    const passwordHash = await hash(data.password, 10);
    await db.user.create({
      data: {
        email,
        name: data.name,
        passwordHash,
        categories: {
          create: [
            ...DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
              name,
              kind: "EXPENSE" as const,
              isDefault: true,
            })),
            ...DEFAULT_INCOME_CATEGORIES.map((name) => ({
              name,
              kind: "INCOME" as const,
              isDefault: true,
            })),
          ],
        },
      },
    });
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function loginWithCredentials(values: {
  email: string;
  password: string;
}): Promise<ActionResult> {
  try {
    await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Invalid email or password" };
  }
}
