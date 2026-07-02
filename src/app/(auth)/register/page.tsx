"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerSchema, type RegisterFormValues } from "@/lib/validators";
import { loginWithCredentials, registerUser } from "@/server/actions/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setError(null);
    const result = await registerUser(values);
    if (!result.ok) {
      setError(result.error ?? "Registration failed");
      return;
    }
    await loginWithCredentials({ email: values.email, password: values.password });
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Create your account</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Default income and expense categories are set up for you.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" autoComplete="name" {...register("name")} />
        {errors.name ? <p className="text-xs text-negative">{errors.name.message}</p> : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        {errors.email ? <p className="text-xs text-negative">{errors.email.message}</p> : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
        {errors.password ? <p className="text-xs text-negative">{errors.password.message}</p> : null}
      </div>
      {error ? <p className="text-xs text-negative">{error}</p> : null}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating account..." : "Create account"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
