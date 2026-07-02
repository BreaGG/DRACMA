"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { ACCOUNT_TYPES } from "@/lib/constants";
import { formatCents } from "@/lib/finance/money";
import { accountSchema, type AccountFormValues } from "@/lib/validators";
import { createAccount, deleteAccount, updateAccount } from "@/server/actions/accounts";

export interface AccountRow {
  id: string;
  name: string;
  type: string;
  balanceCents: number;
  currency: string;
  notes: string | null;
  countsAsCash: boolean;
  countsAsSavings: boolean;
  inNetWorth: boolean;
}

const typeLabel = (value: string) =>
  ACCOUNT_TYPES.find((t) => t.value === value)?.label ?? value;

const emptyValues: AccountFormValues = {
  name: "",
  type: "CHECKING",
  balance: 0,
  currency: "EUR",
  notes: "",
  countsAsCash: true,
  countsAsSavings: false,
  inNetWorth: true,
};

export function AccountsClient({ accounts }: { accounts: AccountRow[] }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AccountRow | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: emptyValues,
  });

  const openCreate = () => {
    setEditing(null);
    form.reset(emptyValues);
    setDialogOpen(true);
  };

  const openEdit = (account: AccountRow) => {
    setEditing(account);
    form.reset({
      name: account.name,
      type: account.type as AccountFormValues["type"],
      balance: account.balanceCents / 100,
      currency: account.currency,
      notes: account.notes ?? "",
      countsAsCash: account.countsAsCash,
      countsAsSavings: account.countsAsSavings,
      inNetWorth: account.inNetWorth,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: AccountFormValues) => {
    setError(null);
    const result = editing
      ? await updateAccount(editing.id, values)
      : await createAccount(values);
    if (result.ok) {
      setDialogOpen(false);
      router.refresh();
    } else {
      setError(result.error ?? "Failed to save");
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this account? Its transactions will also be removed.")) return;
    await deleteAccount(id);
    router.refresh();
  };

  const totalCash = accounts
    .filter((a) => a.countsAsCash)
    .reduce((s, a) => s + a.balanceCents, 0);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Accounts"
        description={`Available cash across accounts: ${formatCents(totalCash)}`}
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add account
          </Button>
        }
      />

      <div className="rounded-xl border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Counts as</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No accounts yet. Add your bank account, cash and savings to get started.
                </TableCell>
              </TableRow>
            ) : (
              accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell className="text-secondary-foreground">
                    {typeLabel(account.type)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCents(account.balanceCents, account.currency)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {account.countsAsCash ? <Badge variant="accent">cash</Badge> : null}
                      {account.countsAsSavings ? <Badge variant="positive">savings</Badge> : null}
                      {account.inNetWorth ? <Badge>net worth</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(account)} aria-label="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(account.id)} aria-label="Delete">
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
        title={editing ? "Edit account" : "Add account"}
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Main bank account" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-xs text-negative">{form.formState.errors.name.message}</p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type">Type</Label>
              <Select id="type" {...form.register("type")}>
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="balance">Current balance (€)</Label>
              <Input id="balance" type="number" step="0.01" {...form.register("balance")} />
            </div>
          </div>
          <div className="flex flex-col gap-2.5 rounded-lg border border-border p-3">
            <Controller
              control={form.control}
              name="countsAsCash"
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <Label htmlFor="countsAsCash">Counts toward available cash</Label>
                  <Switch id="countsAsCash" checked={!!field.value} onCheckedChange={field.onChange} />
                </div>
              )}
            />
            <Controller
              control={form.control}
              name="countsAsSavings"
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <Label htmlFor="countsAsSavings">Counts toward savings</Label>
                  <Switch id="countsAsSavings" checked={!!field.value} onCheckedChange={field.onChange} />
                </div>
              )}
            />
            <Controller
              control={form.control}
              name="inNetWorth"
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <Label htmlFor="inNetWorth">Counts toward net worth</Label>
                  <Switch id="inNetWorth" checked={!!field.value} onCheckedChange={field.onChange} />
                </div>
              )}
            />
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
