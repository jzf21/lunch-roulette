import { joinRoom, serializeRoom } from "@/lib/room";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await request.json();
  const name = body.name?.trim();
  if (!name) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  const result = joinRoom(code.toUpperCase(), name, body.memberId);
  if (!result) {
    return Response.json({ error: "Room not found" }, { status: 404 });
  }

  return Response.json({
    memberId: result.memberId,
    room: serializeRoom(result.room),
  });
}
