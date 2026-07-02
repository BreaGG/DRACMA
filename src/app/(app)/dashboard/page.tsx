import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Info } from "lucide-react";
import { requireUserId } from "@/auth";
import { loadFinanceData } from "@/server/finance-data";
import {
  disposableIncomeForMonth,
  eventsForMonth,
  formatCents,
  generateInsights,
  monthLabel,
  netWorth,
  projectMonths,
  totalDebt,
} from "@/lib/finance";
import { StatTile } from "@/components/stat-tile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CashFlowChart } from "@/components/charts/cash-flow-chart";
import { TrendChart } from "@/components/charts/trend-chart";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const userId = await requireUserId();
  const { input, accounts, currency } = await loadFinanceData(userId);
  const projection = projectMonths(input, 12);
  const current = projection.months[0];
  const today = new Date();

  const currentNetWorth = netWorth(accounts, input.debts, input.installmentPlans);
  const currentDebt = totalDebt(input.debts, input.installmentPlans);
  const insights = generateInsights(input, projection, today, currency);

  const upcoming = projection.months
    .slice(0, 2)
    .flatMap((m) => eventsForMonth(input, { year: m.year, month: m.month }))
    .filter(
      (e) =>
        e.kind !== "income" &&
        e.date.getTime() >= today.getTime() &&
        e.date.getTime() <= today.getTime() + 30 * 24 * 3600 * 1000
    )
    .slice(0, 8);

  const chartMonths = projection.months.map((m) => ({
    label: monthLabel({ year: m.year, month: m.month }).replace(" 20", " '"),
    income: m.incomeCents,
    expenses:
      m.fixedExpensesCents +
      m.variableExpensesCents +
      m.debtPaymentsCents +
      m.installmentPaymentsCents,
    debt: m.totalDebtCents,
    savings: m.totalSavingsCents,
  }));

  const healthChecks = [
    {
      label: "Cash flow",
      ok: current.netCashFlowCents >= 0,
      detail: `${formatCents(current.netCashFlowCents)} this month`,
    },
    {
      label: "Debt trend",
      ok:
        projection.months[projection.months.length - 1].totalDebtCents <=
        current.totalDebtCents,
      detail: "next 12 months",
    },
    {
      label: "Balance stays positive",
      ok: projection.firstNegativeMonth === null,
      detail: projection.firstNegativeMonth ?? "next 12 months",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      {/* Hero */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">Current total balance</p>
        <p className="mt-1 text-5xl font-semibold tracking-tight">
          {formatCents(input.startingCashCents, currency)}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {healthChecks.map((check) => (
            <Badge key={check.label} variant={check.ok ? "positive" : "warning"}>
              {check.label}: {check.ok ? "OK" : "attention"} · {check.detail}
            </Badge>
          ))}
        </div>
      </div>

      {/* KPI rows */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Monthly income" valueCents={current.incomeCents} hint="expected this month" />
        <StatTile label="Fixed expenses" valueCents={current.fixedExpensesCents} hint="this month" />
        <StatTile label="Variable expenses" valueCents={current.variableExpensesCents} hint="estimate" />
        <StatTile
          label="Disposable income"
          valueCents={disposableIncomeForMonth(current)}
          hint="after obligations"
          tone={disposableIncomeForMonth(current) < 0 ? "negative" : "default"}
        />
        <StatTile
          label="Total debt"
          valueCents={currentDebt}
          tone={currentDebt > 0 ? "negative" : "default"}
          hint="loans + installments"
        />
        <StatTile label="Savings" valueCents={input.startingSavingsCents} hint="across savings accounts" />
        <StatTile
          label="End-of-month balance"
          valueCents={current.endingBalanceCents}
          tone={current.endingBalanceCents < 0 ? "negative" : "default"}
          hint="projected"
        />
        <StatTile label="Net worth" valueCents={currentNetWorth} hint="assets − debts" />
      </div>

      {/* Charts */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly cash flow — next 12 months</CardTitle>
          </CardHeader>
          <CardContent>
            <CashFlowChart
              data={chartMonths.map((m) => ({ label: m.label, income: m.income, expenses: m.expenses }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Debt evolution</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={chartMonths.map((m) => ({ label: m.label, value: m.debt }))}
              name="Total debt"
              color="var(--chart-debt)"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Savings evolution</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={chartMonths.map((m) => ({ label: m.label, value: m.savings }))}
              name="Total savings"
              color="var(--chart-savings)"
            />
          </CardContent>
        </Card>
      </div>

      {/* Upcoming + insights */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Upcoming payments — next 30 days</CardTitle>
            <Link
              href="/calendar"
              className="flex items-center gap-1 text-xs text-accent hover:underline"
            >
              Calendar <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No payments due in the next 30 days.</p>
            ) : (
              <ul className="divide-y divide-border">
                {upcoming.map((event, i) => (
                  <li key={i} className="flex items-center justify-between py-2.5 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="w-14 shrink-0 text-xs text-muted-foreground">
                        {event.date.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          timeZone: "UTC",
                        })}
                      </span>
                      <span>{event.name}</span>
                    </div>
                    <span className="font-medium tabular-nums">
                      {formatCents(event.amountCents, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Insights</CardTitle>
          </CardHeader>
          <CardContent>
            {insights.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                Add income, expenses and debts to get insights.
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {insights.slice(0, 7).map((insight, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    {insight.severity === "warning" ? (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    ) : insight.severity === "positive" ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
                    ) : (
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="text-secondary-foreground">{insight.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
