/**
 * Seed a demo user with realistic data so the app is explorable immediately.
 * Login: demo@dracma.app / demo1234
 */
import "dotenv/config";
import { hashSync } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { generateInstallmentSchedule } from "../src/lib/finance/installments";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from "../src/lib/constants";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

async function main() {
  const email = "demo@dracma.app";
  await db.user.deleteMany({ where: { email } });

  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  const monthsAgo = (n: number, day: number) => {
    const zero = y * 12 + (m - 1) - n;
    return utcDate(Math.floor(zero / 12), (zero % 12) + 1, day);
  };

  const user = await db.user.create({
    data: {
      email,
      name: "Demo",
      passwordHash: hashSync("demo1234", 10),
      currency: "EUR",
      categories: {
        create: [
          ...DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
            name,
            kind: "EXPENSE" as const,
            isDefault: true,
          })),
          ...DEFAULT_INCOME_CATEGORIES.map((name) => ({
            name,
            kind: "INCOME" as const,
            isDefault: true,
          })),
        ],
      },
    },
    include: { categories: true },
  });

  const category = (name: string) => user.categories.find((c) => c.name === name)?.id;

  // --- Accounts ---
  const mainAccount = await db.account.create({
    data: {
      userId: user.id,
      name: "Main bank account",
      type: "CHECKING",
      balanceCents: 245_000,
      countsAsCash: true,
    },
  });
  const savingsAccount = await db.account.create({
    data: {
      userId: user.id,
      name: "Savings account",
      type: "SAVINGS",
      balanceCents: 375_000,
      countsAsCash: false,
      countsAsSavings: true,
    },
  });
  const revolut = await db.account.create({
    data: {
      userId: user.id,
      name: "Revolut",
      type: "DIGITAL",
      balanceCents: 31_000,
      countsAsCash: true,
    },
  });
  await db.account.create({
    data: {
      userId: user.id,
      name: "Cash",
      type: "CASH",
      balanceCents: 12_000,
      countsAsCash: true,
    },
  });
  const paypal = await db.account.create({
    data: {
      userId: user.id,
      name: "PayPal",
      type: "PAYPAL",
      balanceCents: 4_500,
      countsAsCash: true,
    },
  });

  // --- Income ---
  await db.incomeSource.createMany({
    data: [
      {
        userId: user.id,
        name: "Salary",
        amountCents: 210_000,
        frequency: "MONTHLY",
        paymentDay: 28,
        accountId: mainAccount.id,
        categoryId: category("Salary"),
        startDate: monthsAgo(24, 1),
      },
      {
        userId: user.id,
        name: "Freelance design",
        amountCents: 25_000,
        frequency: "MONTHLY",
        paymentDay: 15,
        accountId: revolut.id,
        categoryId: category("Freelance"),
        startDate: monthsAgo(6, 1),
      },
    ],
  });

  // --- Fixed expenses ---
  const fixed: Array<[string, number, number, string]> = [
    ["Rent", 85_000, 1, "Rent / Housing"],
    ["Electricity + water", 9_500, 5, "Utilities"],
    ["Phone + internet", 4_500, 10, "Phone / Internet"],
    ["Gym membership", 4_200, 3, "Gym"],
    ["Netflix + Spotify", 2_500, 8, "Subscriptions"],
    ["Triathlon club", 6_000, 2, "Sport / Triathlon"],
  ];
  for (const [name, amountCents, paymentDay, cat] of fixed) {
    await db.expense.create({
      data: {
        userId: user.id,
        name,
        amountCents,
        kind: "FIXED",
        frequency: "MONTHLY",
        paymentDay,
        accountId: mainAccount.id,
        categoryId: category(cat),
        isEssential: cat !== "Subscriptions",
        startDate: monthsAgo(12, 1),
      },
    });
  }
  await db.expense.create({
    data: {
      userId: user.id,
      name: "Bike insurance",
      amountCents: 18_000,
      kind: "FIXED",
      frequency: "YEARLY",
      paymentDay: 12,
      accountId: mainAccount.id,
      categoryId: category("Insurance"),
      isEssential: true,
      startDate: monthsAgo(10, 12),
    },
  });

  // --- Variable spending estimates ---
  const variable: Array<[string, number, string, boolean]> = [
    ["Food & groceries", 30_000, "Food", true],
    ["Transport", 8_000, "Transport", true],
    ["Restaurants", 12_000, "Restaurants", false],
    ["Entertainment", 6_000, "Entertainment", false],
  ];
  for (const [name, amountCents, cat, essential] of variable) {
    await db.expense.create({
      data: {
        userId: user.id,
        name,
        amountCents,
        kind: "VARIABLE",
        frequency: "MONTHLY",
        paymentDay: 15,
        accountId: mainAccount.id,
        categoryId: category(cat),
        isEssential: essential,
        startDate: monthsAgo(12, 1),
      },
    });
  }

  // --- Debt: bank loan ---
  await db.debt.create({
    data: {
      userId: user.id,
      name: "Car loan",
      type: "BANK_LOAN",
      originalAmountCents: 700_000,
      balanceCents: 480_000,
      interestRateBps: 590,
      monthlyPaymentCents: 22_000,
      paymentDay: 5,
      startDate: monthsAgo(11, 5),
      lender: "BBVA",
      accountId: mainAccount.id,
      status: "ACTIVE",
    },
  });

  // --- PayPal Pay in 3: laptop, first installment already paid ---
  const laptopSchedule = generateInstallmentSchedule(90_000, 3, monthsAgo(1, 15));
  await db.installmentPlan.create({
    data: {
      userId: user.id,
      name: "Laptop",
      provider: "PayPal Pay in 3",
      totalAmountCents: 90_000,
      installmentCount: 3,
      installmentAmountCents: 30_000,
      firstPaymentDate: laptopSchedule[0].dueDate,
      accountId: paypal.id,
      status: "ACTIVE",
      payments: {
        create: laptopSchedule.map((p) => ({
          sequence: p.sequence,
          dueDate: p.dueDate,
          amountCents: p.amountCents,
          status: p.sequence === 1 ? "PAID" : "PENDING",
          paidAt: p.sequence === 1 ? p.dueDate : null,
        })),
      },
    },
  });

  // --- Savings goals ---
  await db.savingsGoal.createMany({
    data: [
      {
        userId: user.id,
        name: "Emergency fund",
        targetCents: 500_000,
        currentCents: 300_000,
        monthlyContributionCents: 20_000,
        priority: "HIGH",
        accountId: savingsAccount.id,
      },
      {
        userId: user.id,
        name: "New triathlon bike",
        targetCents: 250_000,
        currentCents: 60_000,
        monthlyContributionCents: 15_000,
        priority: "MEDIUM",
        accountId: savingsAccount.id,
        targetDate: utcDate(y + 1, m, 1),
      },
      {
        userId: user.id,
        name: "Summer travel",
        targetCents: 120_000,
        currentCents: 15_000,
        monthlyContributionCents: 10_000,
        priority: "LOW",
        accountId: savingsAccount.id,
      },
    ],
  });

  // --- A few recent transactions ---
  await db.transaction.createMany({
    data: [
      {
        userId: user.id,
        date: monthsAgo(0, 1),
        amountCents: 85_000,
        type: "EXPENSE",
        accountId: mainAccount.id,
        categoryId: category("Rent / Housing"),
        description: "Rent",
      },
      {
        userId: user.id,
        date: monthsAgo(0, 2),
        amountCents: 4_350,
        type: "EXPENSE",
        accountId: mainAccount.id,
        categoryId: category("Food"),
        description: "Groceries",
      },
      {
        userId: user.id,
        date: monthsAgo(1, 28),
        amountCents: 210_000,
        type: "INCOME",
        accountId: mainAccount.id,
        categoryId: category("Salary"),
        description: "Salary",
      },
      {
        userId: user.id,
        date: monthsAgo(1, 15),
        amountCents: 30_000,
        type: "EXPENSE",
        accountId: paypal.id,
        categoryId: category("Other"),
        description: "Laptop — Pay in 3 (1/3)",
      },
    ],
  });

  console.log("Seeded demo user:", email, "(password: demo1234)");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
