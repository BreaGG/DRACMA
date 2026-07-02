import { z } from "zod";

/** Accepts "12,50", "12.50" or 12.5 and normalizes to a positive amount in euros. */
const moneyField = z.coerce
  .number({ message: "Enter a valid amount" })
  .min(0, "Must be positive")
  .max(100_000_000, "Amount too large");

const optionalDate = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

const requiredDate = z.string().min(1, "Required");

export const accountSchema = z.object({
  name: z.string().min(1, "Required").max(80),
  type: z.enum([
    "CHECKING",
    "SAVINGS",
    "CASH",
    "DIGITAL",
    "CREDIT_CARD",
    "PAYPAL",
    "INVESTMENT",
    "OTHER",
  ]),
  balance: z.coerce.number().min(-100_000_000).max(100_000_000),
  currency: z.string().min(3).max(3).default("EUR"),
  notes: z.string().max(500).optional().nullable(),
  countsAsCash: z.boolean().default(true),
  countsAsSavings: z.boolean().default(false),
  inNetWorth: z.boolean().default(true),
});
export type AccountFormValues = z.input<typeof accountSchema>;

export const incomeSchema = z.object({
  name: z.string().min(1, "Required").max(80),
  amount: moneyField,
  frequency: z.enum(["MONTHLY", "WEEKLY", "YEARLY", "ONE_TIME"]),
  paymentDay: z.coerce.number().int().min(1).max(31).default(1),
  accountId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  startDate: requiredDate,
  endDate: optionalDate,
  notes: z.string().max(500).optional().nullable(),
});
export type IncomeFormValues = z.input<typeof incomeSchema>;

export const expenseSchema = z.object({
  name: z.string().min(1, "Required").max(80),
  amount: moneyField,
  kind: z.enum(["FIXED", "VARIABLE"]),
  frequency: z.enum(["MONTHLY", "WEEKLY", "YEARLY", "ONE_TIME"]),
  paymentDay: z.coerce.number().int().min(1).max(31).default(1),
  accountId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  isEssential: z.boolean().default(true),
  startDate: requiredDate,
  endDate: optionalDate,
  notes: z.string().max(500).optional().nullable(),
});
export type ExpenseFormValues = z.input<typeof expenseSchema>;

export const debtSchema = z.object({
  name: z.string().min(1, "Required").max(80),
  type: z.enum([
    "BANK_LOAN",
    "PERSONAL_LOAN",
    "CREDIT_CARD",
    "PAYPAL_PAY_IN_3",
    "BNPL",
    "INFORMAL",
    "OTHER",
  ]),
  originalAmount: moneyField,
  balance: moneyField,
  interestRatePct: z.coerce.number().min(0).max(100).default(0),
  monthlyPayment: moneyField,
  paymentDay: z.coerce.number().int().min(1).max(31).default(1),
  startDate: requiredDate,
  expectedEndDate: optionalDate,
  lender: z.string().max(80).optional().nullable(),
  accountId: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  status: z.enum(["ACTIVE", "PAID", "PAUSED"]).default("ACTIVE"),
});
export type DebtFormValues = z.input<typeof debtSchema>;

export const installmentPlanSchema = z.object({
  name: z.string().min(1, "Required").max(80),
  provider: z.string().max(80).default("PayPal Pay in 3"),
  totalAmount: moneyField.refine((v) => v > 0, "Must be greater than 0"),
  installmentCount: z.coerce.number().int().min(1).max(60),
  firstPaymentDate: requiredDate,
  paidInstallments: z.coerce.number().int().min(0).default(0),
  accountId: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});
export type InstallmentPlanFormValues = z.input<typeof installmentPlanSchema>;

export const savingsGoalSchema = z.object({
  name: z.string().min(1, "Required").max(80),
  target: moneyField.refine((v) => v > 0, "Must be greater than 0"),
  current: moneyField,
  monthlyContribution: moneyField,
  targetDate: optionalDate,
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  accountId: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  status: z.enum(["ACTIVE", "COMPLETED", "PAUSED"]).default("ACTIVE"),
});
export type SavingsGoalFormValues = z.input<typeof savingsGoalSchema>;

export const transactionSchema = z.object({
  date: requiredDate,
  amount: moneyField.refine((v) => v > 0, "Must be greater than 0"),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER", "DEBT_PAYMENT", "SAVINGS_CONTRIBUTION"]),
  accountId: z.string().min(1, "Required"),
  toAccountId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  debtId: z.string().optional().nullable(),
  savingsGoalId: z.string().optional().nullable(),
  description: z.string().min(1, "Required").max(120),
  notes: z.string().max(500).optional().nullable(),
});
export type TransactionFormValues = z.input<typeof transactionSchema>;

export const registerSchema = z.object({
  name: z.string().min(1, "Required").max(80),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});
export type RegisterFormValues = z.input<typeof registerSchema>;

export const scenarioChangeSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("ADD_EXPENSE"),
    name: z.string().min(1),
    amountCents: z.number().int().min(0),
    frequency: z.enum(["MONTHLY", "WEEKLY", "YEARLY", "ONE_TIME"]),
    paymentDay: z.number().int().min(1).max(31),
    startMonthOffset: z.number().int().min(0).max(24),
    kind: z.enum(["FIXED", "VARIABLE"]),
  }),
  z.object({ type: z.literal("REMOVE_EXPENSE"), name: z.string().min(1) }),
  z.object({
    type: z.literal("CHANGE_EXPENSE_AMOUNT"),
    name: z.string().min(1),
    newAmountCents: z.number().int().min(0),
  }),
  z.object({
    type: z.literal("ADD_INCOME"),
    name: z.string().min(1),
    amountCents: z.number().int().min(0),
    frequency: z.enum(["MONTHLY", "WEEKLY", "YEARLY", "ONE_TIME"]),
    paymentDay: z.number().int().min(1).max(31),
    startMonthOffset: z.number().int().min(0).max(24),
  }),
  z.object({
    type: z.literal("CHANGE_INCOME_AMOUNT"),
    name: z.string().min(1),
    newAmountCents: z.number().int().min(0),
  }),
  z.object({
    type: z.literal("EXTRA_INCOME_ONCE"),
    name: z.string().min(1),
    amountCents: z.number().int().min(0),
    monthOffset: z.number().int().min(0).max(24),
  }),
  z.object({
    type: z.literal("ADD_DEBT"),
    name: z.string().min(1),
    principalCents: z.number().int().min(0),
    interestRateBps: z.number().int().min(0).max(100_000),
    monthlyPaymentCents: z.number().int().min(0),
    paymentDay: z.number().int().min(1).max(31),
  }),
  z.object({
    type: z.literal("ADD_INSTALLMENT_PLAN"),
    name: z.string().min(1),
    totalAmountCents: z.number().int().min(1),
    installmentCount: z.number().int().min(1).max(60),
    firstPaymentMonthOffset: z.number().int().min(0).max(24),
    paymentDay: z.number().int().min(1).max(31),
  }),
  z.object({ type: z.literal("PAY_OFF_DEBT"), debtName: z.string().min(1) }),
  z.object({
    type: z.literal("CHANGE_SAVINGS_CONTRIBUTION"),
    goalName: z.string().min(1),
    newMonthlyCents: z.number().int().min(0),
  }),
]);

export const scenarioSchema = z.object({
  name: z.string().min(1, "Required").max(80),
  description: z.string().max(500).optional().nullable(),
  changes: z.array(scenarioChangeSchema).min(1, "Add at least one change"),
});
