"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { FREQUENCIES } from "@/lib/constants";
import { formatCents } from "@/lib/finance/money";
import { normalizedMonthlyAmount } from "@/lib/finance/recurrence";
import { incomeSchema, type IncomeFormValues } from "@/lib/validators";
import { createIncome, deleteIncome, updateIncome } from "@/server/actions/income";

export interface IncomeRow {
  id: string;
  name: string;
  amountCents: number;
  frequency: "MONTHLY" | "WEEKLY" | "YEARLY" | "ONE_TIME";
  paymentDay: number;
  accountId: string | null;
  accountName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  startDate: string;
  endDate: string | null;
  notes: string | null;
}

interface Option {
  id: string;
  name: string;
}

const emptyValues: IncomeFormValues = {
  name: "",
  amount: 0,
  frequency: "MONTHLY",
  paymentDay: 1,
  accountId: "",
  categoryId: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  notes: "",
};

export function IncomeClient({
  incomes,
  accounts,
  categories,
}: {
  incomes: IncomeRow[];
  accounts: Option[];
  categories: Option[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<IncomeRow | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<IncomeFormValues, unknown, z.output<typeof incomeSchema>>({
    resolver: zodResolver(incomeSchema),
    defaultValues: emptyValues,
  });

  const openCreate = () => {
    setEditing(null);
    form.reset(emptyValues);
    setDialogOpen(true);
  };

  const openEdit = (income: IncomeRow) => {
    setEditing(income);
    form.reset({
      name: income.name,
      amount: income.amountCents / 100,
      frequency: income.frequency,
      paymentDay: income.paymentDay,
      accountId: income.accountId ?? "",
      categoryId: income.categoryId ?? "",
      startDate: income.startDate,
      endDate: income.endDate ?? "",
      notes: income.notes ?? "",
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: z.output<typeof incomeSchema>) => {
    setError(null);
    const result = editing ? await updateIncome(editing.id, values) : await createIncome(values);
    if (result.ok) {
      setDialogOpen(false);
      router.refresh();
    } else {
      setError(result.error ?? "Failed to save");
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this income source?")) return;
    await deleteIncome(id);
    router.refresh();
  };

  const monthlyTotal = incomes.reduce(
    (sum, income) =>
      sum +
      normalizedMonthlyAmount({
        name: income.name,
        amountCents: income.amountCents,
        frequency: income.frequency,
        paymentDay: income.paymentDay,
        startDate: new Date(income.startDate),
      }),
    0
  );

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Income"
        description={`Recurring income: ~${formatCents(monthlyTotal)}/month`}
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add income
          </Button>
        }
      />

      <div className="rounded-xl border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Day</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {incomes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No income sources yet. Add your salary to start projecting.
                </TableCell>
              </TableRow>
            ) : (
              incomes.map((income) => (
                <TableRow key={income.id}>
                  <TableCell className="font-medium">{income.name}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-positive">
                    {formatCents(income.amountCents)}
                  </TableCell>
                  <TableCell>
                    <Badge>{FREQUENCIES.find((f) => f.value === income.frequency)?.label}</Badge>
                  </TableCell>
                  <TableCell className="text-secondary-foreground">{income.paymentDay}</TableCell>
                  <TableCell className="text-secondary-foreground">
                    {income.categoryName ?? "—"}
                  </TableCell>
                  <TableCell className="text-secondary-foreground">
                    {income.accountName ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(income)} aria-label="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(income.id)} aria-label="Delete">
                        <Trash2 className="h-3.5 w-3.5 text-negative" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? "Edit income" : "Add income"}
        description="Recurring income (salary) or one-off (tax refund, gift)."
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Salary" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-xs text-negative">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Amount (€)</Label>
              <Input id="amount" type="number" step="0.01" {...form.register("amount")} />
              {form.formState.errors.amount ? (
                <p className="text-xs text-negative">{form.formState.errors.amount.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="frequency">Frequency</Label>
              <Select id="frequency" {...form.register("frequency")}>
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="paymentDay">Payment day</Label>
              <Input id="paymentDay" type="number" min={1} max={31} {...form.register("paymentDay")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="categoryId">Category</Label>
              <Select id="categoryId" {...form.register("categoryId")}>
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="accountId">Arrives in account</Label>
              <Select id="accountId" {...form.register("accountId")}>
                <option value="">—</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" type="date" {...form.register("startDate")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="endDate">End date (optional)</Label>
              <Input id="endDate" type="date" {...form.register("endDate")} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} {...form.register("notes")} />
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
