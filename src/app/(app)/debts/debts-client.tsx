"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Pencil, Plus, Trash2 } from "lucide-react";
import type { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DEBT_TYPES } from "@/lib/constants";
import { formatCents } from "@/lib/finance/money";
import { projectLoan } from "@/lib/finance/loans";
import { debtSchema, installmentPlanSchema, type DebtFormValues, type InstallmentPlanFormValues } from "@/lib/validators";
import { createDebt, deleteDebt, recordDebtPayment, updateDebt } from "@/server/actions/debts";
import {
  createInstallmentPlan,
  deleteInstallmentPlan,
  payNextInstallment,
} from "@/server/actions/installments";

export interface DebtRow {
  id: string;
  name: string;
  type: string;
  originalAmountCents: number;
  balanceCents: number;
  interestRateBps: number;
  monthlyPaymentCents: number;
  paymentDay: number;
  startDate: string;
  expectedEndDate: string | null;
  lender: string | null;
  accountId: string | null;
  notes: string | null;
  status: "ACTIVE" | "PAID" | "PAUSED";
}

export interface PlanRow {
  id: string;
  name: string;
  provider: string;
  totalAmountCents: number;
  installmentCount: number;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  payments: {
    sequence: number;
    dueDate: string;
    amountCents: number;
    status: "PENDING" | "PAID";
  }[];
}

interface Option {
  id: string;
  name: string;
}

const emptyDebt: DebtFormValues = {
  name: "",
  type: "BANK_LOAN",
  originalAmount: 0,
  balance: 0,
  interestRatePct: 0,
  monthlyPayment: 0,
  paymentDay: 1,
  startDate: new Date().toISOString().slice(0, 10),
  expectedEndDate: "",
  lender: "",
  accountId: "",
  notes: "",
  status: "ACTIVE",
};

const emptyPlan: InstallmentPlanFormValues = {
  name: "",
  provider: "PayPal Pay in 3",
  totalAmount: 0,
  installmentCount: 3,
  firstPaymentDate: new Date().toISOString().slice(0, 10),
  paidInstallments: 0,
  accountId: "",
  notes: "",
};

function payoffLabel(debt: DebtRow): string {
  if (debt.status !== "ACTIVE" || debt.balanceCents <= 0) return "—";
  const projection = projectLoan(debt.balanceCents, debt.interestRateBps, debt.monthlyPaymentCents);
  if (projection.monthsToPayoff === null) return "payment too low";
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + projection.monthsToPayoff);
  return `${projection.monthsToPayoff} mo · ${d.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`;
}

export function DebtsClient({
  debts,
  plans,
  accounts,
}: {
  debts: DebtRow[];
  plans: PlanRow[];
  accounts: Option[];
}) {
  const router = useRouter();
  const [debtDialog, setDebtDialog] = React.useState(false);
  const [planDialog, setPlanDialog] = React.useState(false);
  const [editing, setEditing] = React.useState<DebtRow | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const debtForm = useForm<DebtFormValues, unknown, z.output<typeof debtSchema>>({
    resolver: zodResolver(debtSchema),
    defaultValues: emptyDebt,
  });
  const planForm = useForm<InstallmentPlanFormValues, unknown, z.output<typeof installmentPlanSchema>>({
    resolver: zodResolver(installmentPlanSchema),
    defaultValues: emptyPlan,
  });

  const openCreateDebt = () => {
    setEditing(null);
    debtForm.reset(emptyDebt);
    setDebtDialog(true);
  };

  const openEditDebt = (debt: DebtRow) => {
    setEditing(debt);
    debtForm.reset({
      name: debt.name,
      type: debt.type as DebtFormValues["type"],
      originalAmount: debt.originalAmountCents / 100,
      balance: debt.balanceCents / 100,
      interestRatePct: debt.interestRateBps / 100,
      monthlyPayment: debt.monthlyPaymentCents / 100,
      paymentDay: debt.paymentDay,
      startDate: debt.startDate,
      expectedEndDate: debt.expectedEndDate ?? "",
      lender: debt.lender ?? "",
      accountId: debt.accountId ?? "",
      notes: debt.notes ?? "",
      status: debt.status,
    });
    setDebtDialog(true);
  };

  const onSubmitDebt = async (values: z.output<typeof debtSchema>) => {
    setError(null);
    const result = editing ? await updateDebt(editing.id, values) : await createDebt(values);
    if (result.ok) {
      setDebtDialog(false);
      router.refresh();
    } else {
      setError(result.error ?? "Failed to save");
    }
  };

  const onSubmitPlan = async (values: z.output<typeof installmentPlanSchema>) => {
    setError(null);
    const result = await createInstallmentPlan(values);
    if (result.ok) {
      setPlanDialog(false);
      router.refresh();
    } else {
      setError(result.error ?? "Failed to save");
    }
  };

  const onDeleteDebt = async (id: string) => {
    if (!confirm("Delete this debt?")) return;
    await deleteDebt(id);
    router.refresh();
  };

  const onRecordPayment = async (debt: DebtRow) => {
    const raw = prompt(
      `Record a payment for "${debt.name}" (remaining ${formatCents(debt.balanceCents)}). Amount in €:`,
      (debt.monthlyPaymentCents / 100).toFixed(2)
    );
    if (!raw) return;
    const amount = Number.parseFloat(raw.replace(",", "."));
    if (Number.isNaN(amount) || amount <= 0) return;
    await recordDebtPayment(debt.id, amount);
    router.refresh();
  };

  const onDeletePlan = async (id: string) => {
    if (!confirm("Delete this installment plan?")) return;
    await deleteInstallmentPlan(id);
    router.refresh();
  };

  const onPayNext = async (id: string) => {
    await payNextInstallment(id);
    router.refresh();
  };

  const totalLoanDebt = debts
    .filter((d) => d.status !== "PAID")
    .reduce((s, d) => s + d.balanceCents, 0);
  const totalInstallmentDebt = plans
    .filter((p) => p.status === "ACTIVE")
    .reduce(
      (s, p) => s + p.payments.filter((x) => x.status === "PENDING").reduce((a, x) => a + x.amountCents, 0),
      0
    );

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Debts & loans"
        description={`Total debt: ${formatCents(totalLoanDebt + totalInstallmentDebt)} (loans ${formatCents(totalLoanDebt)} + installments ${formatCents(totalInstallmentDebt)})`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { planForm.reset(emptyPlan); setPlanDialog(true); }}>
              <Plus className="h-4 w-4" /> Pay in 3 / BNPL
            </Button>
            <Button onClick={openCreateDebt}>
              <Plus className="h-4 w-4" /> Add debt
            </Button>
          </div>
        }
      />

      {/* Loans & other debts */}
      <div className="rounded-xl border border-border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead className="text-right">Monthly</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Payoff</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {debts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No debts registered. That is a good thing — add one only if it exists.
                </TableCell>
              </TableRow>
            ) : (
              debts.map((debt) => (
                <TableRow key={debt.id}>
                  <TableCell>
                    <div className="font-medium">{debt.name}</div>
                    {debt.lender ? (
                      <div className="text-xs text-muted-foreground">{debt.lender}</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-secondary-foreground">
                    {DEBT_TYPES.find((t) => t.value === debt.type)?.label ?? debt.type}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-negative">
                    {formatCents(debt.balanceCents)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(debt.monthlyPaymentCents)}
                  </TableCell>
                  <TableCell className="text-secondary-foreground">
                    {debt.interestRateBps > 0 ? `${(debt.interestRateBps / 100).toFixed(2)}%` : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-secondary-foreground">{payoffLabel(debt)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        debt.status === "ACTIVE"
                          ? "accent"
                          : debt.status === "PAID"
                            ? "positive"
                            : "warning"
                      }
                    >
                      {debt.status.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {debt.status === "ACTIVE" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRecordPayment(debt)}
                          title="Record payment"
                        >
                          Pay
                        </Button>
                      ) : null}
                      <Button variant="ghost" size="icon" onClick={() => openEditDebt(debt)} aria-label="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDeleteDebt(debt.id)} aria-label="Delete">
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

      {/* Installment plans */}
      <h2 className="mb-2 mt-8 text-sm font-medium text-secondary-foreground">
        Installment plans (PayPal Pay in 3, BNPL)
      </h2>
      {plans.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
          No installment plans. Add one when you split a purchase into payments.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => {
            const paid = plan.payments.filter((p) => p.status === "PAID");
            const pending = plan.payments.filter((p) => p.status === "PENDING");
            const remaining = pending.reduce((s, p) => s + p.amountCents, 0);
            const progressPct = Math.round((paid.length / plan.installmentCount) * 100);
            return (
              <div key={plan.id} className="rounded-xl border border-border bg-surface p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{plan.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {plan.provider} · {formatCents(plan.totalAmountCents)} total
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {plan.status === "COMPLETED" ? (
                      <Badge variant="positive">completed</Badge>
                    ) : (
                      <Badge variant="accent">
                        {pending.length} of {plan.installmentCount} left
                      </Badge>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => onDeletePlan(plan.id)} aria-label="Delete plan">
                      <Trash2 className="h-3.5 w-3.5 text-negative" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3">
                  <Progress value={progressPct} />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Paid {formatCents(plan.totalAmountCents - remaining)} · Remaining{" "}
                    <span className="font-medium text-negative">{formatCents(remaining)}</span>
                  </p>
                </div>
                <ul className="mt-3 divide-y divide-border text-sm">
                  {plan.payments.map((payment) => (
                    <li key={payment.sequence} className="flex items-center justify-between py-1.5">
                      <span className="flex items-center gap-2">
                        {payment.status === "PAID" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-positive" />
                        ) : (
                          <span className="inline-block h-3.5 w-3.5 rounded-full border border-baseline" />
                        )}
                        <span className={payment.status === "PAID" ? "text-muted-foreground line-through" : ""}>
                          {payment.sequence}/{plan.installmentCount} ·{" "}
                          {new Date(payment.dueDate + "T00:00:00Z").toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            timeZone: "UTC",
                          })}
                        </span>
                      </span>
                      <span className="font-medium tabular-nums">{formatCents(payment.amountCents)}</span>
                    </li>
                  ))}
                </ul>
                {pending.length > 0 ? (
                  <Button variant="subtle" size="sm" className="mt-3 w-full" onClick={() => onPayNext(plan.id)}>
                    Mark next installment as paid
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* Debt dialog */}
      <Dialog
        open={debtDialog}
        onClose={() => setDebtDialog(false)}
        title={editing ? "Edit debt" : "Add debt"}
      >
        <form onSubmit={debtForm.handleSubmit(onSubmitDebt)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="dname">Name</Label>
              <Input id="dname" placeholder="Car loan" {...debtForm.register("name")} />
              {debtForm.formState.errors.name ? (
                <p className="text-xs text-negative">{debtForm.formState.errors.name.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dtype">Type</Label>
              <Select id="dtype" {...debtForm.register("type")}>
                {DEBT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dlender">Lender</Label>
              <Input id="dlender" {...debtForm.register("lender")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="doriginal">Original amount (€)</Label>
              <Input id="doriginal" type="number" step="0.01" {...debtForm.register("originalAmount")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dbalance">Remaining balance (€)</Label>
              <Input id="dbalance" type="number" step="0.01" {...debtForm.register("balance")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="drate">Annual interest (%)</Label>
              <Input id="drate" type="number" step="0.01" {...debtForm.register("interestRatePct")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dmonthly">Monthly payment (€)</Label>
              <Input id="dmonthly" type="number" step="0.01" {...debtForm.register("monthlyPayment")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dday">Payment day</Label>
              <Input id="dday" type="number" min={1} max={31} {...debtForm.register("paymentDay")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dstatus">Status</Label>
              <Select id="dstatus" {...debtForm.register("status")}>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="PAID">Paid</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dstart">Start date</Label>
              <Input id="dstart" type="date" {...debtForm.register("startDate")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dend">Expected end (optional)</Label>
              <Input id="dend" type="date" {...debtForm.register("expectedEndDate")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="daccount">Charged to account</Label>
              <Select id="daccount" {...debtForm.register("accountId")}>
                <option value="">—</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dnotes">Notes</Label>
            <Textarea id="dnotes" rows={2} {...debtForm.register("notes")} />
          </div>
          {error ? <p className="text-xs text-negative">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDebtDialog(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={debtForm.formState.isSubmitting}>
              {debtForm.formState.isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Installment plan dialog */}
      <Dialog
        open={planDialog}
        onClose={() => setPlanDialog(false)}
        title="Add installment plan"
        description="e.g. PayPal Pay in 3: a €900 laptop becomes 3 payments of €300, one month apart."
      >
        <form onSubmit={planForm.handleSubmit(onSubmitPlan)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="pname">Purchase name</Label>
              <Input id="pname" placeholder="Laptop" {...planForm.register("name")} />
              {planForm.formState.errors.name ? (
                <p className="text-xs text-negative">{planForm.formState.errors.name.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pprovider">Provider</Label>
              <Input id="pprovider" {...planForm.register("provider")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ptotal">Total amount (€)</Label>
              <Input id="ptotal" type="number" step="0.01" {...planForm.register("totalAmount")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pcount"># of installments</Label>
              <Input id="pcount" type="number" min={1} max={60} {...planForm.register("installmentCount")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pfirst">First payment date</Label>
              <Input id="pfirst" type="date" {...planForm.register("firstPaymentDate")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ppaid">Already paid installments</Label>
              <Input id="ppaid" type="number" min={0} {...planForm.register("paidInstallments")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="paccount">Charged to account</Label>
              <Select id="paccount" {...planForm.register("accountId")}>
                <option value="">—</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pnotes">Notes</Label>
            <Textarea id="pnotes" rows={2} {...planForm.register("notes")} />
          </div>
          {error ? <p className="text-xs text-negative">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setPlanDialog(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={planForm.formState.isSubmitting}>
              {planForm.formState.isSubmitting ? "Saving..." : "Create plan"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
