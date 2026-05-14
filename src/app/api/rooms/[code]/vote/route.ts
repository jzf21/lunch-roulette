import { toggleVote } from "@/lib/room";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await request.json();
  const { spotId, memberId } = body;

  if (!spotId || !memberId) {
    return Response.json({ error: "spotId and memberId are required" }, { status: 400 });
  }

  const result = toggleVote(code.toUpperCase(), spotId, memberId);
  if (!result.ok) {
    return Response.json({ error: "Room not found" }, { status: 404 });
  }

  return Response.json({ ok: true, votes: result.votes });
}
