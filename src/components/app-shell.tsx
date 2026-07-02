"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Banknote,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  LineChart,
  Menu,
  PiggyBank,
  Split,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/income", label: "Income", icon: TrendingUp },
  { href: "/expenses", label: "Expenses", icon: TrendingDown },
  { href: "/debts", label: "Debts & loans", icon: CreditCard },
  { href: "/savings", label: "Savings", icon: PiggyBank },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/projections", label: "Projections", icon: LineChart },
  { href: "/scenarios", label: "Scenarios", icon: Split },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
];

export function AppShell({
  children,
  userName,
  signOutForm,
}: {
  children: React.ReactNode;
  userName: string;
  signOutForm: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 px-3">
      {NAV.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-ghost font-medium text-foreground"
                : "text-secondary-foreground hover:bg-ghost hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex items-center gap-2 px-6 py-5">
          <Banknote className="h-5 w-5 text-accent" />
          <span className="text-base font-semibold tracking-tight">DRACMA</span>
        </div>
        {nav}
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{userName}</p>
            {signOutForm}
          </div>
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-accent" />
          <span className="font-semibold tracking-tight">DRACMA</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-md p-2 hover:bg-ghost cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute inset-x-0 top-[53px] border-b border-border bg-surface pb-4 pt-2"
            onClick={(e) => e.stopPropagation()}
          >
            {nav}
            <div className="mt-2 border-t border-border px-6 pt-3">{signOutForm}</div>
          </div>
        </div>
      ) : null}

      <main className="min-w-0 flex-1 px-4 pb-16 pt-[70px] sm:px-6 lg:px-8 lg:pt-8">
        {children}
      </main>
    </div>
  );
}
