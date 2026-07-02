import type { DebtItem, InstallmentPlanItem } from "./types";
import { totalLoanDebt } from "./loans";
import { totalInstallmentDebt } from "./installments";

export interface AccountLike {
  balanceCents: number;
  countsAsCash: boolean;
  countsAsSavings: boolean;
  inNetWorth: boolean;
}

export function availableCash(accounts: AccountLike[]): number {
  return accounts
    .filter((a) => a.countsAsCash)
    .reduce((sum, a) => sum + a.balanceCents, 0);
}

export function totalSavings(accounts: AccountLike[]): number {
  return accounts
    .filter((a) => a.countsAsSavings)
    .reduce((sum, a) => sum + a.balanceCents, 0);
}

/** Assets in net worth that are neither cash nor savings (e.g. investments). */
export function otherAssets(accounts: AccountLike[]): number {
  return accounts
    .filter((a) => a.inNetWorth && !a.countsAsCash && !a.countsAsSavings)
    .reduce((sum, a) => sum + a.balanceCents, 0);
}

export function totalDebt(debts: DebtItem[], plans: InstallmentPlanItem[]): number {
  return totalLoanDebt(debts) + totalInstallmentDebt(plans);
}

export function netWorth(
  accounts: AccountLike[],
  debts: DebtItem[],
  plans: InstallmentPlanItem[]
): number {
  const assets = accounts
    .filter((a) => a.inNetWorth)
    .reduce((sum, a) => sum + a.balanceCents, 0);
  return assets - totalDebt(debts, plans);
}
