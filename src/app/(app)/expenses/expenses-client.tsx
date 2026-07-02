"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
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
import { Switch } from "@/components/ui/switch";
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
import { expenseSchema, type ExpenseFormValues } from "@/lib/validators";
import { createExpense, deleteExpense, updateExpense } from "@/server/actions/expenses";

export interface ExpenseRow {
  id: string;
  name: string;
  amountCents: number;
  kind: "FIXED" | "VARIABLE";
  frequency: "MONTHLY" | "WEEKLY" | "YEARLY" | "ONE_TIME";
  paymentDay: number;
  accountId: string | null;
  accountName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  isEssential: boolean;
  startDate: string;
  endDate: string | null;
  notes: string | null;
}

interface Option {
  id: string;
  name: string;
}

const emptyValues: ExpenseFormValues = {
  name: "",
  amount: 0,
  kind: "FIXED",
  frequency: "MONTHLY",
  paymentDay: 1,
  accountId: "",
  categoryId: "",
  isEssential: true,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  notes: "",
};

function monthlyOf(expense: ExpenseRow): number {
  return normalizedMonthlyAmount({
    name: expense.name,
    amountCents: expense.amountCents,
    frequency: expense.frequency,
    paymentDay: expense.paymentDay,
    startDate: new Date(expense.startDate),
  });
}

export function ExpensesClient({
  expenses,
  accounts,
  categories,
}: {
  expenses: ExpenseRow[];
  accounts: Option[];
  categories: Option[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ExpenseRow | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<ExpenseFormValues, unknown, z.output<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: emptyValues,
  });

  const openCreate = () => {
    setEditing(null);
    form.reset(emptyValues);
    setDialogOpen(true);
  };

  const openEdit = (expense: ExpenseRow) => {
    setEditing(expense);
    form.reset({
      name: expense.name,
      amount: expense.amountCents / 100,
      kind: expense.kind,
      frequency: expense.frequency,
      paymentDay: expense.paymentDay,
      accountId: expense.accountId ?? "",
      categoryId: expense.categoryId ?? "",
      isEssential: expense.isEssential,
      startDate: expense.startDate,
      endDate: expense.endDate ?? "",
      notes: expense.notes ?? "",
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: z.output<typeof expenseSchema>) => {
    setError(null);
    const result = editing
      ? await updateExpense(editing.id, values)
      : await createExpense(values);
    if (result.ok) {
      setDialogOpen(false);
      router.refresh();
    } else {
      setError(result.error ?? "Failed to save");
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    await deleteExpense(id);
    router.refresh();
  };

  const fixed = expenses.filter((e) => e.kind === "FIXED");
  const variable = expenses.filter((e) => e.kind === "VARIABLE");
  const fixedMonthly = fixed.reduce((s, e) => s + monthlyOf(e), 0);
  const variableMonthly = variable.reduce((s, e) => s + monthlyOf(e), 0);

  const renderTable = (rows: ExpenseRow[], emptyMessage: string) => (
    <div className="rounded-xl border border-border bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Day</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Essential</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell className="font-medium">{expense.name}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatCents(expense.amountCents)}
                </TableCell>
                <TableCell>
                  <Badge>{FREQUENCIES.find((f) => f.value === expense.frequency)?.label}</Badge>
                </TableCell>
                <TableCell className="text-secondary-foreground">{expense.paymentDay}</TableCell>
                <TableCell className="text-secondary-foreground">
                  {expense.categoryName ?? "—"}
                </TableCell>
                <TableCell>
                  {expense.isEssential ? (
                    <Badge variant="outline">essential</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">no</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(expense)} aria-label="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(expense.id)} aria-label="Delete">
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
  );

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Expenses"
        description={`Fixed: ~${formatCents(fixedMonthly)}/month · Variable estimate: ~${formatCents(variableMonthly)}/month`}
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add expense
          </Button>
        }
      />

      <h2 className="mb-2 text-sm font-medium text-secondary-foreground">Fixed expenses</h2>
      {renderTable(fixed, "No fixed expenses yet. Add rent, utilities and subscriptions.")}

      <h2 className="mb-2 mt-6 text-sm font-medium text-secondary-foreground">
        Variable spending (monthly estimates)
      </h2>
      {renderTable(variable, "No variable estimates yet. Add food, transport or entertainment budgets.")}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? "Edit expense" : "Add expense"}
        description="Fixed = a bill with a known amount and day. Variable = a monthly estimate."
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Rent" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-xs text-negative">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Amount (€)</Label>
              <Input id="amount" type="number" step="0.01" {...form.register("amount")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kind">Kind</Label>
              <Select id="kind" {...form.register("kind")}>
                <option value="FIXED">Fixed bill</option>
                <option value="VARIABLE">Variable estimate</option>
              </Select>
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
              <Label htmlFor="accountId">Charged to account</Label>
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
          <Controller
            control={form.control}
            name="isEssential"
            render={({ field }) => (
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <Label htmlFor="isEssential">Essential expense</Label>
                <Switch id="isEssential" checked={!!field.value} onCheckedChange={field.onChange} />
              </div>
            )}
          />
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
