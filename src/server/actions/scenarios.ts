"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/auth";
import { db } from "@/lib/db";
import { scenarioSchema } from "@/lib/validators";
import { failure, type ActionResult } from "./helpers";
import type { Prisma } from "@/generated/prisma/client";

export async function saveScenario(values: unknown): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const data = scenarioSchema.parse(values);
    await db.scenario.create({
      data: {
        userId,
        name: data.name,
        description: data.description ?? null,
        changes: data.changes as Prisma.InputJsonValue,
      },
    });
    revalidatePath("/scenarios");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteScenario(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await db.scenario.delete({ where: { id, userId } });
    revalidatePath("/scenarios");
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
