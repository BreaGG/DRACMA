import type { Metadata } from "next";
import { requireUserId } from "@/auth";
import { db } from "@/lib/db";
import { IncomeClient } from "./income-client";

export const metadata: Metadata = { title: "Income" };

export default async function IncomePage() {
  const userId = await requireUserId();
  const [incomes, accounts, categories] = await Promise.all([
    db.incomeSource.findMany({
      where: { userId },
      orderBy: { amountCents: "desc" },
      include: { account: { select: { name: true } }, category: { select: { name: true } } },
    }),
    db.account.findMany({ where: { userId }, select: { id: true, name: true } }),
    db.category.findMany({
      where: { userId, kind: "INCOME" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <IncomeClient
      incomes={incomes.map((i) => ({
        id: i.id,
        name: i.name,
        amountCents: i.amountCents,
        frequency: i.frequency,
        paymentDay: i.paymentDay,
        accountId: i.accountId,
        accountName: i.account?.name ?? null,
        categoryId: i.categoryId,
        categoryName: i.category?.name ?? null,
        startDate: i.startDate.toISOString().slice(0, 10),
        endDate: i.endDate ? i.endDate.toISOString().slice(0, 10) : null,
        notes: i.notes,
      }))}
      accounts={accounts}
      categories={categories}
    />
  );
}
