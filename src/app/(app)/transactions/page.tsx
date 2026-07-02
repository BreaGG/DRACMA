import type { Metadata } from "next";
import { requireUserId } from "@/auth";
import { db } from "@/lib/db";
import { TransactionsClient } from "./transactions-client";

export const metadata: Metadata = { title: "Transactions" };

export default async function TransactionsPage() {
  const userId = await requireUserId();
  const [transactions, accounts, categories, debts, goals] = await Promise.all([
    db.transaction.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 200,
      include: {
        account: { select: { name: true } },
        toAccount: { select: { name: true } },
        category: { select: { name: true } },
      },
    }),
    db.account.findMany({ where: { userId }, select: { id: true, name: true } }),
    db.category.findMany({
      where: { userId },
      select: { id: true, name: true, kind: true },
      orderBy: { name: "asc" },
    }),
    db.debt.findMany({
      where: { userId, status: { not: "PAID" } },
      select: { id: true, name: true },
    }),
    db.savingsGoal.findMany({
      where: { userId, status: "ACTIVE" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <TransactionsClient
      transactions={transactions.map((t) => ({
        id: t.id,
        date: t.date.toISOString().slice(0, 10),
        amountCents: t.amountCents,
        type: t.type,
        accountName: t.account.name,
        toAccountName: t.toAccount?.name ?? null,
        categoryName: t.category?.name ?? null,
        description: t.description,
      }))}
      accounts={accounts}
      categories={categories}
      debts={debts}
      goals={goals}
    />
  );
}
