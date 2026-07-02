import { Banknote } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-8 flex items-center gap-2">
        <Banknote className="h-6 w-6 text-accent" />
        <span className="text-xl font-semibold tracking-tight">DRACMA</span>
      </div>
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6">
        {children}
      </div>
      <p className="mt-6 max-w-sm text-center text-xs text-muted-foreground">
        Your entire financial life, understood at a glance.
      </p>
    </div>
  );
}
