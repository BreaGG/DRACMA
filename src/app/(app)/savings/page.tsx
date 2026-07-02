import type { Metadata } from "next";
import { requireUserId } from "@/auth";
import { db } from "@/lib/db";
import { SavingsClient } from "./savings-client";

export const metadata: Metadata = { title: "Savings" };

export default async function SavingsPage() {
  const userId = await requireUserId();
  const [goals, accounts] = await Promise.all([
    db.savingsGoal.findMany({
      where: { userId },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      include: { account: { select: { name: true } } },
    }),
    db.account.findMany({ where: { userId }, select: { id: true, name: true } }),
  ]);

  return (
    <SavingsClient
      goals={goals.map((g) => ({
        id: g.id,
        name: g.name,
        targetCents: g.targetCents,
        currentCents: g.currentCents,
        monthlyContributionCents: g.monthlyContributionCents,
        targetDate: g.targetDate ? g.targetDate.toISOString().slice(0, 10) : null,
        priority: g.priority,
        accountId: g.accountId,
        accountName: g.account?.name ?? null,
        notes: g.notes,
        status: g.status,
      }))}
      accounts={accounts}
    />
  );
}
