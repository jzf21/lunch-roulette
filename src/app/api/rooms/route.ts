import { createRoom } from "@/lib/room";

export async function POST(request: Request) {
  const body = await request.json();
  const hostName = body.hostName?.trim();
  if (!hostName) {
    return Response.json({ error: "hostName is required" }, { status: 400 });
  }

  const { room, memberId } = createRoom(hostName);
  return Response.json({ code: room.code, memberId });
}
