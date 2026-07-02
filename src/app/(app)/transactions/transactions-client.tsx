"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import type { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TRANSACTION_TYPES } from "@/lib/constants";
import { formatCents } from "@/lib/finance/money";
import { transactionSchema, type TransactionFormValues } from "@/lib/validators";
import { createTransaction, deleteTransaction } from "@/server/actions/transactions";

export interface TransactionRow {
  id: string;
  date: string;
  amountCents: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER" | "DEBT_PAYMENT" | "SAVINGS_CONTRIBUTION";
  accountName: string;
  toAccountName: string | null;
  categoryName: string | null;
  description: string;
}

interface Option {
  id: string;
  name: string;
}

interface CategoryOption extends Option {
  kind: "INCOME" | "EXPENSE";
}

const SIGN: Record<TransactionRow["type"], -1 | 1> = {
  INCOME: 1,
  EXPENSE: -1,
  TRANSFER: -1,
  DEBT_PAYMENT: -1,
  SAVINGS_CONTRIBUTION: -1,
};

export function TransactionsClient({
  transactions,
  accounts,
  categories,
  debts,
  goals,
}: {
  transactions: TransactionRow[];
  accounts: Option[];
  categories: CategoryOption[];
  debts: Option[];
  goals: Option[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const emptyValues: TransactionFormValues = {
    date: new Date().toISOString().slice(0, 10),
    amount: 0,
    type: "EXPENSE",
    accountId: accounts[0]?.id ?? "",
    toAccountId: "",
    categoryId: "",
    debtId: "",
    savingsGoalId: "",
    description: "",
    notes: "",
  };

  const form = useForm<TransactionFormValues, unknown, z.output<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: emptyValues,
  });

  const type = form.watch("type");

  const onSubmit = async (values: z.output<typeof transactionSchema>) => {
    setError(null);
    const result = await createTransaction(values);
    if (result.ok) {
      setDialogOpen(false);
      router.refresh();
    } else {
      setError(result.error ?? "Failed to save");
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this transaction? Its balance effects will be reversed.")) return;
    await deleteTransaction(id);
    router.refresh();
  };

  const filteredCategories = categories.filter((c) =>
    type === "INCOME" ? c.kind === "INCOME" : c.kind === "EXPENSE"
  );

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Transactions"
        description="Manual movements. Each transaction updates its account balance."
        action={
          <Button
            onClick={() => {
              form.reset(emptyValues);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add transaction
          </Button>
        }
      />

      <div className="rounded-xl border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No transactions yet.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="whitespace-nowrap text-secondary-foreground">
                    {new Date(t.date + "T00:00:00Z").toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </TableCell>
                  <TableCell className="font-medium">{t.description}</TableCell>
                  <TableCell>
                    <Badge>
                      {TRANSACTION_TYPES.find((x) => x.value === t.type)?.label ?? t.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-secondary-foreground">
                    {t.accountName}
                    {t.toAccountName ? ` → ${t.toAccountName}` : ""}
                  </TableCell>
                  <TableCell className="text-secondary-foreground">{t.categoryName ?? "—"}</TableCell>
                  <TableCell
                    className={`text-right font-medium tabular-nums ${
                      SIGN[t.type] > 0 ? "text-positive" : "text-foreground"
                    }`}
                  >
                    {SIGN[t.type] > 0 ? "+" : "−"}
                    {formatCents(t.amountCents)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(t.id)} aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5 text-negative" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Add transaction">
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tdate">Date</Label>
              <Input id="tdate" type="date" {...form.register("date")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tamount">Amount (€)</Label>
              <Input id="tamount" type="number" step="0.01" {...form.register("amount")} />
              {form.formState.errors.amount ? (
                <p className="text-xs text-negative">{form.formState.errors.amount.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ttype">Type</Label>
              <Select id="ttype" {...form.register("type")}>
                {TRANSACTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="taccount">Account</Label>
              <Select id="taccount" {...form.register("accountId")}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </div>
            {type === "TRANSFER" || type === "SAVINGS_CONTRIBUTION" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ttoaccount">To account</Label>
                <Select id="ttoaccount" {...form.register("toAccountId")}>
                  <option value="">—</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            {type === "DEBT_PAYMENT" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tdebt">Debt</Label>
                <Select id="tdebt" {...form.register("debtId")}>
                  <option value="">—</option>
                  {debts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            {type === "SAVINGS_CONTRIBUTION" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tgoal">Savings goal</Label>
                <Select id="tgoal" {...form.register("savingsGoalId")}>
                  <option value="">—</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            {type === "INCOME" || type === "EXPENSE" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tcategory">Category</Label>
                <Select id="tcategory" {...form.register("categoryId")}>
                  <option value="">—</option>
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tdesc">Description</Label>
            <Input id="tdesc" placeholder="Groceries at Mercadona" {...form.register("description")} />
            {form.formState.errors.description ? (
              <p className="text-xs text-negative">{form.formState.errors.description.message}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tnotes">Notes</Label>
            <Textarea id="tnotes" rows={2} {...form.register("notes")} />
          </div>
          {error ? <p className="text-xs text-negative">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
