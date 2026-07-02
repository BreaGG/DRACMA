export const ACCOUNT_TYPES = [
  { value: "CHECKING", label: "Main bank account" },
  { value: "SAVINGS", label: "Savings account" },
  { value: "CASH", label: "Cash" },
  { value: "DIGITAL", label: "Revolut / Wise / digital bank" },
  { value: "CREDIT_CARD", label: "Credit card" },
  { value: "PAYPAL", label: "PayPal" },
  { value: "INVESTMENT", label: "Investment account" },
  { value: "OTHER", label: "Other" },
] as const;

export const FREQUENCIES = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "YEARLY", label: "Yearly" },
  { value: "ONE_TIME", label: "One-time" },
] as const;

export const DEBT_TYPES = [
  { value: "BANK_LOAN", label: "Bank loan" },
  { value: "PERSONAL_LOAN", label: "Personal loan" },
  { value: "CREDIT_CARD", label: "Credit card debt" },
  { value: "PAYPAL_PAY_IN_3", label: "PayPal Pay in 3" },
  { value: "BNPL", label: "Buy now, pay later" },
  { value: "INFORMAL", label: "Informal debt" },
  { value: "OTHER", label: "Other financing" },
] as const;

export const GOAL_PRIORITIES = [
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
] as const;

export const TRANSACTION_TYPES = [
  { value: "INCOME", label: "Income" },
  { value: "EXPENSE", label: "Expense" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "DEBT_PAYMENT", label: "Debt payment" },
  { value: "SAVINGS_CONTRIBUTION", label: "Savings contribution" },
] as const;

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Rent / Housing",
  "Utilities",
  "Phone / Internet",
  "Subscriptions",
  "Gym",
  "Food",
  "Transport",
  "Insurance",
  "Health",
  "Sport / Triathlon",
  "Clothes",
  "Restaurants",
  "Entertainment",
  "Travel",
  "Other",
] as const;

export const DEFAULT_INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Tax refund",
  "Gifts",
  "Other income",
] as const;

export const PROJECTION_PERIODS = [3, 6, 12, 24] as const;
