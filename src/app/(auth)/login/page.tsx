"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithCredentials } from "@/server/actions/auth";

interface LoginValues {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginValues>({ defaultValues: { email: "", password: "" } });

  const onSubmit = async (values: LoginValues) => {
    setError(null);
    const result = await loginWithCredentials(values);
    if (result.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setError(result.error ?? "Login failed");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Sign in</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Demo account: <span className="font-mono">demo@dracma.app</span> /{" "}
          <span className="font-mono">demo1234</span>
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...register("email", { required: true })} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register("password", { required: true })}
        />
      </div>
      {error ? <p className="text-xs text-negative">{error}</p> : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Sign in"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        No account?{" "}
        <Link href="/register" className="font-medium text-accent hover:underline">
          Create one
        </Link>
      </p>
    </form>
  );
}
