import type { Metadata } from "next";
import { requireUserId } from "@/auth";
import { db } from "@/lib/db";
import { loadFinanceData } from "@/server/finance-data";
import { serializeInput } from "@/lib/finance/serialize";
import type { ScenarioChange } from "@/lib/finance/scenario";
import { ScenariosClient } from "./scenarios-client";

export const metadata: Metadata = { title: "Scenarios" };

export default async function ScenariosPage() {
  const userId = await requireUserId();
  const [{ input }, scenarios] = await Promise.all([
    loadFinanceData(userId),
    db.scenario.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <ScenariosClient
      input={serializeInput(input)}
      saved={scenarios.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        changes: s.changes as unknown as ScenarioChange[],
      }))}
    />
  );
}
