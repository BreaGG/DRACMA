import type { Metadata } from "next";
import { requireUserId } from "@/auth";
import { db } from "@/lib/db";
import { AccountsClient } from "./accounts-client";

export const metadata: Metadata = { title: "Accounts" };

export default async function AccountsPage() {
  const userId = await requireUserId();
  const accounts = await db.account.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <AccountsClient
      accounts={accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        balanceCents: a.balanceCents,
        currency: a.currency,
        notes: a.notes,
        countsAsCash: a.countsAsCash,
        countsAsSavings: a.countsAsSavings,
        inNetWorth: a.inNetWorth,
      }))}
    />
  );
}
