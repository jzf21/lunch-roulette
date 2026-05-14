import { addSpotToRoom } from "@/lib/room";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await request.json();
  const spot = body.spot;
  if (!spot || !spot.name) {
    return Response.json({ error: "spot is required" }, { status: 400 });
  }

  const ok = addSpotToRoom(code.toUpperCase(), spot);
  if (!ok) {
    return Response.json({ error: "Room not found" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
