import type { Metadata } from "next";
import Link from "next/link";
import { requireUserId } from "@/auth";
import { loadFinanceData } from "@/server/finance-data";
import {
  disposableIncomeForMonth,
  formatCents,
  monthLabel,
  projectMonths,
} from "@/lib/finance";
import { PROJECTION_PERIODS } from "@/lib/constants";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CashFlowChart } from "@/components/charts/cash-flow-chart";
import { TrendChart } from "@/components/charts/trend-chart";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Projections" };

export default async function ProjectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ months?: string }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;
  const months = Math.min(60, Math.max(1, Number.parseInt(params.months ?? "12", 10) || 12));

  const { input, currency } = await loadFinanceData(userId);
  const projection = projectMonths(input, months);

  const chartData = projection.months.map((m) => ({
    label: monthLabel({ year: m.year, month: m.month }).replace(" 20", " '"),
    income: m.incomeCents,
    expenses:
      m.fixedExpensesCents +
      m.variableExpensesCents +
      m.debtPaymentsCents +
      m.installmentPaymentsCents,
    balance: m.endingBalanceCents,
    debt: m.totalDebtCents,
    savings: m.totalSavingsCents,
    netWorth: m.netWorthCents,
  }));

  const isCustom = !PROJECTION_PERIODS.includes(months as (typeof PROJECTION_PERIODS)[number]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Projections"
        description="Month-by-month projection of income, expenses, debts, savings and net worth."
      />

      {/* Period selector — one filter row above everything it scopes */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {PROJECTION_PERIODS.map((p) => (
          <Link
            key={p}
            href={`/projections?months=${p}`}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm transition-colors",
              months === p
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border bg-surface text-secondary-foreground hover:bg-ghost"
            )}
          >
            {p} months
          </Link>
        ))}
        <form action="/projections" className="flex items-center gap-1.5">
          <input
            type="number"
            name="months"
            min={1}
            max={60}
            defaultValue={isCustom ? months : undefined}
            placeholder="Custom"
            className={cn(
              "h-[34px] w-24 rounded-md border px-3 text-sm bg-surface",
              isCustom ? "border-accent" : "border-border"
            )}
          />
          <button type="submit" className="text-sm text-accent hover:underline cursor-pointer">
            Go
          </button>
        </form>
      </div>

      {projection.firstNegativeMonth ? (
        <div className="mb-5 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          ⚠ Your projected balance goes negative in{" "}
          <span className="font-medium">
            {monthLabel({
              year: Number(projection.firstNegativeMonth.slice(0, 4)),
              month: Number(projection.firstNegativeMonth.slice(5, 7)),
            })}
          </span>
          . Consider reducing expenses or delaying purchases.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cash flow</CardTitle>
          </CardHeader>
          <CardContent>
            <CashFlowChart data={chartData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Projected end-of-month balance</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={chartData.map((m) => ({ label: m.label, value: m.balance }))}
              name="Ending balance"
              color="var(--chart-cash)"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Net worth</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={chartData.map((m) => ({ label: m.label, value: m.netWorth }))}
              name="Net worth"
              color="var(--chart-networth)"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Debt evolution</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={chartData.map((m) => ({ label: m.label, value: m.debt }))}
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
              data={chartData.map((m) => ({ label: m.label, value: m.savings }))}
              name="Total savings"
              color="var(--chart-savings)"
            />
          </CardContent>
        </Card>
      </div>

      {/* The table view — full detail, month by month */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Monthly projection table</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Start</TableHead>
                <TableHead className="text-right">Income</TableHead>
                <TableHead className="text-right">Fixed</TableHead>
                <TableHead className="text-right">Variable</TableHead>
                <TableHead className="text-right">Debt pay</TableHead>
                <TableHead className="text-right">Installments</TableHead>
                <TableHead className="text-right">To savings</TableHead>
                <TableHead className="text-right">End balance</TableHead>
                <TableHead className="text-right">Disposable</TableHead>
                <TableHead className="text-right">Total debt</TableHead>
                <TableHead className="text-right">Savings</TableHead>
                <TableHead className="text-right">Net worth</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projection.months.map((m) => (
                <TableRow key={m.key}>
                  <TableCell className="whitespace-nowrap font-medium">
                    {monthLabel({ year: m.year, month: m.month })}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(m.startingBalanceCents, currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-positive">
                    {formatCents(m.incomeCents, currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(m.fixedExpensesCents, currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(m.variableExpensesCents, currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(m.debtPaymentsCents, currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(m.installmentPaymentsCents, currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(m.savingsContributionsCents, currency)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium tabular-nums",
                      m.endingBalanceCents < 0 && "text-negative"
                    )}
                  >
                    {formatCents(m.endingBalanceCents, currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(disposableIncomeForMonth(m), currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(m.totalDebtCents, currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(m.totalSavingsCents, currency)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCents(m.netWorthCents, currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
