import { triggerSpin } from "@/lib/room";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await request.json();
  const { memberId } = body;

  if (!memberId) {
    return Response.json({ error: "memberId is required" }, { status: 400 });
  }

  const result = triggerSpin(code.toUpperCase(), memberId);
  if (!result.ok) {
    return Response.json({ error: "Room not found or spin already active" }, { status: 400 });
  }

  return Response.json({ ok: true, seed: result.seed, result: result.result });
}
