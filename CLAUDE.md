# DRACMA — agent notes

Personal finance app. Next.js App Router + TS strict + Tailwind v4 + Prisma 7
(PostgreSQL, driver adapter `@prisma/adapter-pg`) + Auth.js v5 + Recharts + Vitest.

## Commands

- `npm run dev` / `npm run build` / `npm start`
- `npm test` — Vitest, covers `src/lib/finance/`
- `npm run lint`
- `npx prisma migrate dev` / `npx prisma db seed` / `npx prisma generate`
- Postgres: `docker compose up -d` (`postgresql://dracma:dracma@localhost:5432/dracma`)

## Conventions that matter

- **Money is integer cents everywhere.** Convert at the edges only
  (forms use euros; server actions call `toCents`). Display via
  `formatCents` in `src/lib/finance/money.ts`.
- **`src/lib/finance/` must stay pure** — no Prisma, no React, no I/O.
  It runs on the server AND in the browser (scenario simulator). Every
  behavior change there needs a unit test.
- Prisma 7: connection URL lives in `prisma.config.ts` (NOT in
  schema.prisma); the generated client is at `src/generated/prisma`
  (gitignored — run `npx prisma generate` after install).
- All dates in the engine are UTC; month refs are `{ year, month }` with
  month 1-12; month keys are `"YYYY-MM"`.
- Server actions in `src/server/actions/` re-validate with Zod schemas from
  `src/lib/validators.ts` and always scope queries by `userId` from
  `requireUserId()`.
- Chart colors are fixed per entity (cash=blue, income=aqua, expense=red,
  debt=orange, savings=violet, net worth=green) via CSS vars in
  `globals.css` — don't reassign per chart.
- Next 16: route guard file is `src/proxy.ts` (the middleware convention is
  deprecated).
