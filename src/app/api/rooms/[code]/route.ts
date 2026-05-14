import { getRoom, serializeRoom } from "@/lib/room";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const room = getRoom(code.toUpperCase());
  if (!room) {
    return Response.json({ error: "Room not found" }, { status: 404 });
  }
  return Response.json({ room: serializeRoom(room) });
}
