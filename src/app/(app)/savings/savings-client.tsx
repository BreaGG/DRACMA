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
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { GOAL_PRIORITIES } from "@/lib/constants";
import { formatCents } from "@/lib/finance/money";
import { projectGoal } from "@/lib/finance/goals";
import { monthLabel } from "@/lib/finance/dates";
import { savingsGoalSchema, type SavingsGoalFormValues } from "@/lib/validators";
import {
  createSavingsGoal,
  deleteSavingsGoal,
  updateSavingsGoal,
} from "@/server/actions/savings";

export interface GoalRow {
  id: string;
  name: string;
  targetCents: number;
  currentCents: number;
  monthlyContributionCents: number;
  targetDate: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  accountId: string | null;
  accountName: string | null;
  notes: string | null;
  status: "ACTIVE" | "COMPLETED" | "PAUSED";
}

interface Option {
  id: string;
  name: string;
}

const emptyValues: SavingsGoalFormValues = {
  name: "",
  target: 0,
  current: 0,
  monthlyContribution: 0,
  targetDate: "",
  priority: "MEDIUM",
  accountId: "",
  notes: "",
  status: "ACTIVE",
};

export function SavingsClient({ goals, accounts }: { goals: GoalRow[]; accounts: Option[] }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<GoalRow | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<SavingsGoalFormValues, unknown, z.output<typeof savingsGoalSchema>>({
    resolver: zodResolver(savingsGoalSchema),
    defaultValues: emptyValues,
  });

  const openCreate = () => {
    setEditing(null);
    form.reset(emptyValues);
    setDialogOpen(true);
  };

  const openEdit = (goal: GoalRow) => {
    setEditing(goal);
    form.reset({
      name: goal.name,
      target: goal.targetCents / 100,
      current: goal.currentCents / 100,
      monthlyContribution: goal.monthlyContributionCents / 100,
      targetDate: goal.targetDate ?? "",
      priority: goal.priority,
      accountId: goal.accountId ?? "",
      notes: goal.notes ?? "",
      status: goal.status,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: z.output<typeof savingsGoalSchema>) => {
    setError(null);
    const result = editing
      ? await updateSavingsGoal(editing.id, values)
      : await createSavingsGoal(values);
    if (result.ok) {
      setDialogOpen(false);
      router.refresh();
    } else {
      setError(result.error ?? "Failed to save");
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this savings goal?")) return;
    await deleteSavingsGoal(id);
    router.refresh();
  };

  const now = new Date();
  const fromMonth = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
  const totalSaved = goals.reduce((s, g) => s + g.currentCents, 0);
  const totalMonthly = goals
    .filter((g) => g.status === "ACTIVE")
    .reduce((s, g) => s + g.monthlyContributionCents, 0);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Savings goals"
        description={`Saved across goals: ${formatCents(totalSaved)} · Contributing ${formatCents(totalMonthly)}/month`}
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add goal
          </Button>
        }
      />

      {goals.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
          No savings goals yet. Start with an emergency fund.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((goal) => {
            const projection = projectGoal(
              {
                name: goal.name,
                targetCents: goal.targetCents,
                currentCents: goal.currentCents,
                monthlyContributionCents: goal.monthlyContributionCents,
                targetDate: goal.targetDate ? new Date(goal.targetDate + "T00:00:00Z") : null,
                status: goal.status,
              },
              fromMonth
            );
            const completionLabel = projection.estimatedCompletionKey
              ? monthLabel({
                  year: Number(projection.estimatedCompletionKey.slice(0, 4)),
                  month: Number(projection.estimatedCompletionKey.slice(5, 7)),
                })
              : null;
            return (
              <div key={goal.id} className="rounded-xl border border-border bg-surface p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{goal.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {goal.accountName ? `${goal.accountName} · ` : ""}
                      {GOAL_PRIORITIES.find((p) => p.value === goal.priority)?.label} priority
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {goal.status !== "ACTIVE" ? (
                      <Badge variant={goal.status === "COMPLETED" ? "positive" : "warning"}>
                        {goal.status.toLowerCase()}
                      </Badge>
                    ) : null}
                    <Button variant="ghost" size="icon" onClick={() => openEdit(goal)} aria-label="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(goal.id)} aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5 text-negative" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-semibold">{formatCents(goal.currentCents)}</span>
                    <span className="text-muted-foreground">of {formatCents(goal.targetCents)}</span>
                  </div>
                  <Progress className="mt-2" value={projection.progressPct} tone="savings" />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {projection.progressPct}% · {formatCents(projection.remainingCents)} to go
                  </p>
                </div>

                <div className="mt-3 flex flex-col gap-1 text-xs text-secondary-foreground">
                  <span>
                    Contributing{" "}
                    <span className="font-medium">{formatCents(goal.monthlyContributionCents)}/month</span>
                  </span>
                  {completionLabel ? (
                    <span>
                      Estimated completion: <span className="font-medium">{completionLabel}</span>
                      {projection.monthsToTarget !== null
                        ? ` (${projection.monthsToTarget} months)`
                        : ""}
                    </span>
                  ) : projection.remainingCents > 0 ? (
                    <span className="text-warning">No monthly contribution set — goal will not progress.</span>
                  ) : null}
                  {projection.onTrack === false ? (
                    <span className="text-warning">
                      Behind target date — needs {formatCents(projection.requiredMonthlyCents ?? 0)}/month.
                    </span>
                  ) : projection.onTrack === true ? (
                    <span className="text-positive">On track for the target date.</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? "Edit goal" : "Add savings goal"}
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="gname">Name</Label>
              <Input id="gname" placeholder="Emergency fund" {...form.register("name")} />
              {form.formState.errors.name ? (
                <p className="text-xs text-negative">{form.formState.errors.name.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gtarget">Target amount (€)</Label>
              <Input id="gtarget" type="number" step="0.01" {...form.register("target")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gcurrent">Current amount (€)</Label>
              <Input id="gcurrent" type="number" step="0.01" {...form.register("current")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gmonthly">Monthly contribution (€)</Label>
              <Input id="gmonthly" type="number" step="0.01" {...form.register("monthlyContribution")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gdate">Target date (optional)</Label>
              <Input id="gdate" type="date" {...form.register("targetDate")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gpriority">Priority</Label>
              <Select id="gpriority" {...form.register("priority")}>
                {GOAL_PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gstatus">Status</Label>
              <Select id="gstatus" {...form.register("status")}>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="COMPLETED">Completed</option>
              </Select>
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="gaccount">Linked account</Label>
              <Select id="gaccount" {...form.register("accountId")}>
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
            <Label htmlFor="gnotes">Notes</Label>
            <Textarea id="gnotes" rows={2} {...form.register("notes")} />
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
