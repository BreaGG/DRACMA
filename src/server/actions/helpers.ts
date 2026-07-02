import "server-only";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export function toCents(euros: number): number {
  return Math.round(euros * 100);
}

export function toDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function toDateOrNull(value: string | null | undefined): Date | null {
  return value ? toDate(value) : null;
}

export function failure(error: unknown): ActionResult {
  if (error instanceof Error && error.message === "Unauthorized") throw error;
  console.error(error);
  return { ok: false, error: "Something went wrong. Please try again." };
}
