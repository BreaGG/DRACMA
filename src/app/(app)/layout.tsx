import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <AppShell
      userName={session.user.name ?? session.user.email ?? "Account"}
      signOutForm={
        <form action={doSignOut}>
          <button
            type="submit"
            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Sign out
          </button>
        </form>
      }
    >
      {children}
    </AppShell>
  );
}
