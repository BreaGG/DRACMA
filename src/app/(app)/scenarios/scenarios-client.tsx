"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatCents } from "@/lib/finance/money";
import { monthLabel } from "@/lib/finance/dates";
import { compareScenario, type ScenarioChange } from "@/lib/finance/scenario";
import {
  deserializeInput,
  type SerializedProjectionInput,
} from "@/lib/finance/serialize";
import { ComparisonChart } from "@/components/charts/comparison-chart";
import { deleteScenario, saveScenario } from "@/server/actions/scenarios";
import { cn } from "@/lib/utils";

interface SavedScenario {
  id: string;
  name: string;
  description: string | null;
  changes: ScenarioChange[];
}

type Metric = "balance" | "debt" | "savings" | "netWorth" | "cashFlow";

const METRICS: { key: Metric; label: string }[] = [
  { key: "balance", label: "End-of-month balance" },
  { key: "cashFlow", label: "Monthly cash flow" },
  { key: "debt", label: "Total debt" },
  { key: "savings", label: "Savings" },
  { key: "netWorth", label: "Net worth" },
];

const CHANGE_LABELS: Record<ScenarioChange["type"], string> = {
  ADD_EXPENSE: "Add a monthly/one-off expense",
  REMOVE_EXPENSE: "Remove an expense",
  CHANGE_EXPENSE_AMOUNT: "Change an expense amount (rent…)",
  ADD_INCOME: "Add recurring income",
  CHANGE_INCOME_AMOUNT: "Change income amount (salary…)",
  EXTRA_INCOME_ONCE: "One-off extra income",
  ADD_DEBT: "Take a new loan / debt",
  ADD_INSTALLMENT_PLAN: "New Pay in 3 / BNPL purchase",
  PAY_OFF_DEBT: "Pay off a debt early",
  CHANGE_SAVINGS_CONTRIBUTION: "Change savings contribution",
};

function describeChange(change: ScenarioChange): string {
  switch (change.type) {
    case "ADD_EXPENSE":
      return `+ Expense "${change.name}" ${formatCents(change.amountCents)}/${change.frequency === "MONTHLY" ? "mo" : change.frequency.toLowerCase()}`;
    case "REMOVE_EXPENSE":
      return `− Remove expense "${change.name}"`;
    case "CHANGE_EXPENSE_AMOUNT":
      return `~ "${change.name}" → ${formatCents(change.newAmountCents)}`;
    case "ADD_INCOME":
      return `+ Income "${change.name}" ${formatCents(change.amountCents)}/mo`;
    case "CHANGE_INCOME_AMOUNT":
      return `~ Income "${change.name}" → ${formatCents(change.newAmountCents)}`;
    case "EXTRA_INCOME_ONCE":
      return `+ One-off "${change.name}" ${formatCents(change.amountCents)} in month ${change.monthOffset + 1}`;
    case "ADD_DEBT":
      return `+ Debt "${change.name}" ${formatCents(change.principalCents)} @ ${formatCents(change.monthlyPaymentCents)}/mo`;
    case "ADD_INSTALLMENT_PLAN":
      return `+ Pay in ${change.installmentCount}: "${change.name}" ${formatCents(change.totalAmountCents)}`;
    case "PAY_OFF_DEBT":
      return `✓ Pay off "${change.debtName}" now`;
    case "CHANGE_SAVINGS_CONTRIBUTION":
      return `~ Savings "${change.goalName}" → ${formatCents(change.newMonthlyCents)}/mo`;
  }
}

export function ScenariosClient({
  input,
  saved,
}: {
  input: SerializedProjectionInput;
  saved: SavedScenario[];
}) {
  const router = useRouter();
  const baseInput = React.useMemo(() => deserializeInput(input), [input]);
  const [changes, setChanges] = React.useState<ScenarioChange[]>([]);
  const [months, setMonths] = React.useState(12);
  const [metric, setMetric] = React.useState<Metric>("balance");
  const [scenarioName, setScenarioName] = React.useState("");

  // Builder state
  const [changeType, setChangeType] = React.useState<ScenarioChange["type"]>("ADD_EXPENSE");
  const [fName, setFName] = React.useState("");
  const [fAmount, setFAmount] = React.useState("");
  const [fCount, setFCount] = React.useState("3");
  const [fRate, setFRate] = React.useState("0");
  const [fMonthly, setFMonthly] = React.useState("");
  const [fOffset, setFOffset] = React.useState("0");
  const [fTarget, setFTarget] = React.useState("");

  const comparison = React.useMemo(
    () => compareScenario(baseInput, changes, months),
    [baseInput, changes, months]
  );

  const addChange = () => {
    const cents = Math.round(Number.parseFloat(fAmount.replace(",", ".") || "0") * 100);
    const monthlyCents = Math.round(Number.parseFloat(fMonthly.replace(",", ".") || "0") * 100);
    const offset = Math.max(0, Number.parseInt(fOffset, 10) || 0);
    let change: ScenarioChange | null = null;

    switch (changeType) {
      case "ADD_EXPENSE":
        if (!fName || cents <= 0) return;
        change = {
          type: "ADD_EXPENSE",
          name: fName,
          amountCents: cents,
          frequency: "MONTHLY",
          paymentDay: 1,
          startMonthOffset: offset,
          kind: "FIXED",
        };
        break;
      case "REMOVE_EXPENSE":
        if (!fTarget) return;
        change = { type: "REMOVE_EXPENSE", name: fTarget };
        break;
      case "CHANGE_EXPENSE_AMOUNT":
        if (!fTarget || cents < 0) return;
        change = { type: "CHANGE_EXPENSE_AMOUNT", name: fTarget, newAmountCents: cents };
        break;
      case "ADD_INCOME":
        if (!fName || cents <= 0) return;
        change = {
          type: "ADD_INCOME",
          name: fName,
          amountCents: cents,
          frequency: "MONTHLY",
          paymentDay: 28,
          startMonthOffset: offset,
        };
        break;
      case "CHANGE_INCOME_AMOUNT":
        if (!fTarget || cents < 0) return;
        change = { type: "CHANGE_INCOME_AMOUNT", name: fTarget, newAmountCents: cents };
        break;
      case "EXTRA_INCOME_ONCE":
        if (!fName || cents <= 0) return;
        change = { type: "EXTRA_INCOME_ONCE", name: fName, amountCents: cents, monthOffset: offset };
        break;
      case "ADD_DEBT":
        if (!fName || cents <= 0 || monthlyCents <= 0) return;
        change = {
          type: "ADD_DEBT",
          name: fName,
          principalCents: cents,
          interestRateBps: Math.round(Number.parseFloat(fRate || "0") * 100),
          monthlyPaymentCents: monthlyCents,
          paymentDay: 5,
        };
        break;
      case "ADD_INSTALLMENT_PLAN": {
        const count = Math.max(1, Number.parseInt(fCount, 10) || 3);
        if (!fName || cents <= 0) return;
        change = {
          type: "ADD_INSTALLMENT_PLAN",
          name: fName,
          totalAmountCents: cents,
          installmentCount: count,
          firstPaymentMonthOffset: offset,
          paymentDay: 15,
        };
        break;
      }
      case "PAY_OFF_DEBT":
        if (!fTarget) return;
        change = { type: "PAY_OFF_DEBT", debtName: fTarget };
        break;
      case "CHANGE_SAVINGS_CONTRIBUTION":
        if (!fTarget || monthlyCents < 0) return;
        change = { type: "CHANGE_SAVINGS_CONTRIBUTION", goalName: fTarget, newMonthlyCents: monthlyCents };
        break;
    }

    if (change) {
      setChanges((prev) => [...prev, change]);
      setFName("");
      setFAmount("");
      setFMonthly("");
    }
  };

  const chartData = comparison.months.map((m) => {
    const pick = (row: typeof m.base) =>
      metric === "balance"
        ? row.endingBalanceCents
        : metric === "debt"
          ? row.totalDebtCents
          : metric === "savings"
            ? row.totalSavingsCents
            : metric === "netWorth"
              ? row.netWorthCents
              : row.netCashFlowCents;
    return {
      label: monthLabel({ year: m.base.year, month: m.base.month }).replace(" 20", " '"),
      base: pick(m.base),
      scenario: pick(m.scenario),
    };
  });

  const onSave = async () => {
    if (!scenarioName || changes.length === 0) return;
    const result = await saveScenario({ name: scenarioName, description: null, changes });
    if (result.ok) {
      setScenarioName("");
      router.refresh();
    }
  };

  const targetOptions =
    changeType === "PAY_OFF_DEBT"
      ? input.debts.filter((d) => d.status === "ACTIVE").map((d) => d.name)
      : changeType === "CHANGE_SAVINGS_CONTRIBUTION"
        ? input.savingsGoals.map((g) => g.name)
        : changeType === "CHANGE_INCOME_AMOUNT"
          ? input.incomes.map((i) => i.name)
          : input.expenses.map((e) => e.name);

  const needsName = ["ADD_EXPENSE", "ADD_INCOME", "EXTRA_INCOME_ONCE", "ADD_DEBT", "ADD_INSTALLMENT_PLAN"].includes(changeType);
  const needsTarget = ["REMOVE_EXPENSE", "CHANGE_EXPENSE_AMOUNT", "CHANGE_INCOME_AMOUNT", "PAY_OFF_DEBT", "CHANGE_SAVINGS_CONTRIBUTION"].includes(changeType);
  const needsAmount = !["REMOVE_EXPENSE", "PAY_OFF_DEBT", "CHANGE_SAVINGS_CONTRIBUTION"].includes(changeType);
  const needsMonthly = ["ADD_DEBT", "CHANGE_SAVINGS_CONTRIBUTION"].includes(changeType);
  const needsOffset = ["ADD_EXPENSE", "ADD_INCOME", "EXTRA_INCOME_ONCE", "ADD_INSTALLMENT_PLAN"].includes(changeType);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Scenario simulator"
        description="What happens if…? Compare a hypothetical against your current path — nothing is changed until you decide."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Builder */}
        <Card>
          <CardHeader>
            <CardTitle>Build the scenario</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ctype">Change</Label>
              <Select
                id="ctype"
                value={changeType}
                onChange={(e) => setChangeType(e.target.value as ScenarioChange["type"])}
              >
                {Object.entries(CHANGE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>

            {needsTarget ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ctarget">Which one</Label>
                <Select id="ctarget" value={fTarget} onChange={(e) => setFTarget(e.target.value)}>
                  <option value="">Select…</option>
                  {targetOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            {needsName ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cname">Name</Label>
                <Input
                  id="cname"
                  placeholder={changeType === "ADD_INSTALLMENT_PLAN" ? "New bike" : "Name"}
                  value={fName}
                  onChange={(e) => setFName(e.target.value)}
                />
              </div>
            ) : null}
            {needsAmount ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="camount">
                  {changeType === "ADD_INSTALLMENT_PLAN"
                    ? "Total purchase (€)"
                    : changeType === "ADD_DEBT"
                      ? "Principal (€)"
                      : "Amount (€)"}
                </Label>
                <Input
                  id="camount"
                  type="number"
                  step="0.01"
                  value={fAmount}
                  onChange={(e) => setFAmount(e.target.value)}
                />
              </div>
            ) : null}
            {needsMonthly ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cmonthly">Monthly amount (€)</Label>
                <Input
                  id="cmonthly"
                  type="number"
                  step="0.01"
                  value={fMonthly}
                  onChange={(e) => setFMonthly(e.target.value)}
                />
              </div>
            ) : null}
            {changeType === "ADD_DEBT" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="crate">Annual interest (%)</Label>
                <Input id="crate" type="number" step="0.01" value={fRate} onChange={(e) => setFRate(e.target.value)} />
              </div>
            ) : null}
            {changeType === "ADD_INSTALLMENT_PLAN" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ccount"># installments</Label>
                <Input id="ccount" type="number" min={1} max={24} value={fCount} onChange={(e) => setFCount(e.target.value)} />
              </div>
            ) : null}
            {needsOffset ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="coffset">Starting in (months from now)</Label>
                <Input id="coffset" type="number" min={0} max={24} value={fOffset} onChange={(e) => setFOffset(e.target.value)} />
              </div>
            ) : null}

            <Button onClick={addChange} variant="subtle">
              <Plus className="h-4 w-4" /> Add to scenario
            </Button>

            {changes.length > 0 ? (
              <div className="flex flex-col gap-1.5 border-t border-border pt-3">
                {changes.map((change, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-md bg-ghost px-2.5 py-1.5 text-xs"
                  >
                    <span className="truncate">{describeChange(change)}</span>
                    <button
                      onClick={() => setChanges((prev) => prev.filter((_, j) => j !== i))}
                      className="shrink-0 text-muted-foreground hover:text-negative cursor-pointer"
                      aria-label="Remove change"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <div className="mt-2 flex gap-2">
                  <Input
                    placeholder="Scenario name"
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                  />
                  <Button onClick={onSave} variant="outline" disabled={!scenarioName}>
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}

            {saved.length > 0 ? (
              <div className="flex flex-col gap-1.5 border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground">Saved scenarios</p>
                {saved.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 text-xs">
                    <button
                      onClick={() => setChanges(s.changes)}
                      className="truncate text-left text-accent hover:underline cursor-pointer"
                    >
                      {s.name}
                    </button>
                    <button
                      onClick={async () => {
                        await deleteScenario(s.id);
                        router.refresh();
                      }}
                      className="shrink-0 text-muted-foreground hover:text-negative cursor-pointer"
                      aria-label="Delete scenario"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Results */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* Impact summary */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: `Balance after ${months} mo`, delta: comparison.final.endingBalanceDeltaCents, upGood: true },
              { label: "Total debt", delta: comparison.final.totalDebtDeltaCents, upGood: false },
              { label: "Savings", delta: comparison.final.totalSavingsDeltaCents, upGood: true },
              { label: "Net worth", delta: comparison.final.netWorthDeltaCents, upGood: true },
            ].map((item) => {
              const good = item.delta === 0 ? null : item.delta > 0 === item.upGood;
              return (
                <div key={item.label} className="rounded-xl border border-border bg-surface p-4">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p
                    className={cn(
                      "mt-1 text-lg font-semibold tracking-tight",
                      good === null ? "" : good ? "text-positive" : "text-negative"
                    )}
                  >
                    {item.delta > 0 ? "+" : item.delta < 0 ? "−" : ""}
                    {formatCents(Math.abs(item.delta))}
                  </p>
                </div>
              );
            })}
          </div>

          <Card>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle>Current path vs scenario</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value as Metric)}
                  className="h-8 w-auto text-xs"
                >
                  {METRICS.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </Select>
                <Select
                  value={String(months)}
                  onChange={(e) => setMonths(Number(e.target.value))}
                  className="h-8 w-auto text-xs"
                >
                  {[6, 12, 24].map((m) => (
                    <option key={m} value={m}>
                      {m} months
                    </option>
                  ))}
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {changes.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Add a change on the left to see its impact against your current projection.
                </p>
              ) : (
                <ComparisonChart data={chartData} />
              )}
            </CardContent>
          </Card>

          {changes.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Month-by-month impact ({METRICS.find((m) => m.key === metric)?.label})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Month</th>
                        <th className="py-2 pr-3 text-right font-medium">Current</th>
                        <th className="py-2 pr-3 text-right font-medium">Scenario</th>
                        <th className="py-2 text-right font-medium">Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.map((row, i) => {
                        const delta = row.scenario - row.base;
                        return (
                          <tr key={i} className="border-b border-border last:border-0">
                            <td className="py-1.5 pr-3">{row.label}</td>
                            <td className="py-1.5 pr-3 text-right tabular-nums">{formatCents(row.base)}</td>
                            <td className="py-1.5 pr-3 text-right tabular-nums">{formatCents(row.scenario)}</td>
                            <td
                              className={cn(
                                "py-1.5 text-right font-medium tabular-nums",
                                delta > 0 ? "text-positive" : delta < 0 ? "text-negative" : "text-muted-foreground"
                              )}
                            >
                              {delta > 0 ? "+" : ""}
                              {formatCents(delta)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
