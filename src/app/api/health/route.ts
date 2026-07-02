/** Liveness probe for the deployment platform (no auth, no DB dependency). */
export function GET() {
  return Response.json({ ok: true });
}
