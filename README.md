# DRACMA

Personal finance, understood at a glance. DRACMA answers the questions that
actually matter about your money:

- How much money do I have right now — and at the end of each month?
- How much debt do I have, and how does it evolve month by month?
- What fixed expenses, loan payments and Pay-in-3 installments are coming?
- How much disposable money do I really have after obligations?
- Am I improving or getting worse over time?
- *Can I afford this purchase if I split it into 3 payments?*

## Features

| Area | What it does |
|---|---|
| **Dashboard** | Hero balance, health badges, KPI tiles (income, fixed/variable expenses, debt, savings, end-of-month balance, disposable income, net worth), cash flow / debt / savings charts, upcoming payments, plain-language insights |
| **Accounts** | Bank, savings, cash, Revolut/Wise, credit card, PayPal, investment — with flags for cash / savings / net worth |
| **Income & Expenses** | Recurring (monthly, weekly, yearly) and one-off; fixed bills separated from variable estimates; essential flag; categories |
| **Debts & loans** | Balance, interest, monthly payment, payoff projection; PayPal Pay in 3 / BNPL plans with generated installment schedules |
| **Savings goals** | Target, pace, progress %, estimated completion, on-track check against a target date |
| **Projections** | Deterministic month-by-month engine: 3/6/12/24 months or custom, full table + charts |
| **Scenarios** | Simulate a new expense, debt, Pay-in-3 purchase, salary change, early payoff… and compare against the current path |
| **Transactions** | Manual movements that update account balances (and debts / goals when linked) |
| **Calendar** | Every expected movement of a month, day by day, with heavy days flagged |

## Stack

Next.js (App Router) · TypeScript strict · Tailwind CSS v4 · Prisma 7 +
PostgreSQL · Auth.js (credentials) · Recharts · Zod · React Hook Form · Vitest.

All money is stored as **integer cents** — no floating-point drift.

## Run it locally

Requirements: Node 20+, Docker (or any PostgreSQL 14+).

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL
docker compose up -d

# 3. Configure environment
cp .env.example .env        # defaults match docker-compose
# generate a real AUTH_SECRET for anything beyond local dev:
#   openssl rand -base64 32

# 4. Create the schema and demo data
npx prisma migrate dev
npx prisma db seed

# 5. Start the app
npm run dev
```

Open http://localhost:3000 and sign in with the demo account
**demo@dracma.app / demo1234** (or register your own — default categories are
created automatically).

### Tests

The whole financial engine is pure functions under `src/lib/finance/`,
covered by unit tests:

```bash
npm test
```

## Architecture

```
prisma/schema.prisma      # data model (User, Account, IncomeSource, Expense,
                          # Debt, DebtPayment, InstallmentPlan, InstallmentPayment,
                          # SavingsGoal, Transaction, Category, Scenario,
                          # ProjectionSnapshot)
prisma/seed.ts            # demo user with realistic data
src/lib/finance/          # PURE calculation engine (no DB, no UI, fully tested)
  recurrence.ts           #   expand recurring items into calendar months
  installments.ts         #   Pay-in-3 / BNPL schedule generation
  loans.ts                #   amortization and payoff projection
  projection.ts           #   the month-by-month projection engine
  scenario.ts             #   apply hypothetical changes + diff two projections
  goals.ts                #   savings goal pace / completion estimates
  insights.ts             #   plain-language insights
  calendar.ts             #   expected movements per month
  networth.ts, money.ts, dates.ts
src/server/
  finance-data.ts         # maps Prisma rows -> engine input
  actions/                # Zod-validated server actions (all CRUD)
src/app/(auth)/           # login, register
src/app/(app)/            # dashboard, accounts, income, expenses, debts,
                          # savings, transactions, projections, scenarios, calendar
src/components/           # ui primitives, charts, shell
```

The scenario simulator ships the serialized engine input to the client and
runs the same pure engine in the browser, so comparisons update instantly
without a server round-trip.

## Financial assumptions (projection engine)

Deterministic and documented — the same input always produces the same output:

1. **Recurrence.** Monthly items occur once on their payment day (day 31
   clamps to shorter months). Weekly items expand to their *actual*
   occurrences per calendar month (4 or 5), anchored at the start date.
   Yearly items occur in their anniversary month. One-time items occur once.
2. **Variable expenses** are flat monthly estimates (e.g. "Food ~€300").
3. **Loans** accrue monthly interest = balance × annual rate / 12; payments
   cover interest first, the remainder reduces principal; the final payment
   is capped at what is owed. A payment that doesn't cover interest is
   flagged as never amortizing. Paused debts keep their balance untouched.
4. **Installment plans** (Pay in 3 / BNPL) charge each pending installment in
   its due month; the pending total counts toward total debt. Rounding is
   absorbed by the first installment so schedules sum exactly.
5. **Savings contributions** move money from cash to savings (net-worth
   neutral) and stop automatically when a goal reaches its target.
6. **Ending balance** = starting cash + income − fixed − variable − debt
   payments − installments − savings contributions. Each month's ending
   balance is the next month's starting balance.
7. **Net worth** = cash + savings + other net-worth assets − total debt.
8. **Disposable income** = income − fixed expenses − debt payments −
   installments − planned savings. Variable spending is *what disposable
   income gets spent on*, so it is not subtracted.

## Roadmap ideas

Bank sync (the transaction model is ready for it), multi-currency,
CSV import/export, projection snapshots over time, budgets per category.
