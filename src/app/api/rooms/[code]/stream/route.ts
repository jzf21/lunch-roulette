import { getRoom, serializeRoom, addSubscriber, removeSubscriber } from "@/lib/room";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const upperCode = code.toUpperCase();
  const room = getRoom(upperCode);

  if (!room) {
    return Response.json({ error: "Room not found" }, { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Send current room state immediately
      const initial = `event: connected\ndata: ${JSON.stringify(serializeRoom(room))}\n\n`;
      controller.enqueue(encoder.encode(initial));

      // Register for future broadcasts
      addSubscriber(upperCode, controller);

      // Clean up on client disconnect
      request.signal.addEventListener("abort", () => {
        removeSubscriber(upperCode, controller);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
