import type { Metadata } from "next";
import { requireUserId } from "@/auth";
import { db } from "@/lib/db";
import { ExpensesClient } from "./expenses-client";

export const metadata: Metadata = { title: "Expenses" };

export default async function ExpensesPage() {
  const userId = await requireUserId();
  const [expenses, accounts, categories] = await Promise.all([
    db.expense.findMany({
      where: { userId },
      orderBy: [{ kind: "asc" }, { amountCents: "desc" }],
      include: { account: { select: { name: true } }, category: { select: { name: true } } },
    }),
    db.account.findMany({ where: { userId }, select: { id: true, name: true } }),
    db.category.findMany({
      where: { userId, kind: "EXPENSE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <ExpensesClient
      expenses={expenses.map((e) => ({
        id: e.id,
        name: e.name,
        amountCents: e.amountCents,
        kind: e.kind,
        frequency: e.frequency,
        paymentDay: e.paymentDay,
        accountId: e.accountId,
        accountName: e.account?.name ?? null,
        categoryId: e.categoryId,
        categoryName: e.category?.name ?? null,
        isEssential: e.isEssential,
        startDate: e.startDate.toISOString().slice(0, 10),
        endDate: e.endDate ? e.endDate.toISOString().slice(0, 10) : null,
        notes: e.notes,
      }))}
      accounts={accounts}
      categories={categories}
    />
  );
}
