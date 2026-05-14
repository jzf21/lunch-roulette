import { Spot, RoomState, RoomMember, RoomSpin } from "./types";
import { pickBySpin } from "./pickers";

// ── In-memory stores ────────────────────────────────────────────────────
const rooms = new Map<string, RoomState>();

// SSE subscribers: roomCode -> set of writable controllers
const subscribers = new Map<
  string,
  Set<ReadableStreamDefaultController<Uint8Array>>
>();

const encoder = new TextEncoder();

// ── Room code generation ────────────────────────────────────────────────
const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no O/0/I/1/L

export function generateRoomCode(): string {
  let code: string;
  do {
    code = Array.from({ length: 4 }, () =>
      CHARS[Math.floor(Math.random() * CHARS.length)]
    ).join("");
  } while (rooms.has(code));
  return code;
}

// ── Serialization helper ────────────────────────────────────────────────
export function serializeRoom(room: RoomState): RoomState {
  return { ...room };
}

// ── CRUD ────────────────────────────────────────────────────────────────
export function createRoom(hostName: string): { room: RoomState; memberId: string } {
  const code = generateRoomCode();
  const memberId = crypto.randomUUID();
  const host: RoomMember = { id: memberId, name: hostName, joinedAt: Date.now() };
  const room: RoomState = {
    code,
    createdAt: Date.now(),
    hostId: memberId,
    members: [host],
    spots: [],
    votes: {},
    spin: null,
  };
  rooms.set(code, room);
  return { room, memberId };
}

export function getRoom(code: string): RoomState | undefined {
  return rooms.get(code);
}

export function joinRoom(code: string, name: string, memberId?: string): { room: RoomState; memberId: string } | null {
  const room = rooms.get(code);
  if (!room) return null;

  const id = memberId || crypto.randomUUID();
  const existing = room.members.find((m) => m.id === id);
  if (existing) {
    existing.name = name;
    existing.joinedAt = Date.now();
  } else {
    room.members.push({ id, name, joinedAt: Date.now() });
  }

  broadcastToRoom(code, "member_joined", {
    member: { id, name, joinedAt: Date.now() },
    members: room.members,
  });

  return { room, memberId: id };
}

export function addSpotToRoom(code: string, spot: Spot): boolean {
  const room = rooms.get(code);
  if (!room) return false;
  room.spots.push(spot);
  room.votes[spot.id] = [];
  broadcastToRoom(code, "spot_added", { spot, spots: room.spots });
  return true;
}

export function toggleVote(code: string, spotId: string, memberId: string): { ok: boolean; votes: number } {
  const room = rooms.get(code);
  if (!room) return { ok: false, votes: 0 };

  if (!room.votes[spotId]) room.votes[spotId] = [];
  const voters = room.votes[spotId];
  const idx = voters.indexOf(memberId);
  if (idx >= 0) {
    voters.splice(idx, 1);
  } else {
    voters.push(memberId);
  }

  const voteCount = voters.length;

  // Also update the spot's vote count for picker compatibility
  const spot = room.spots.find((s) => s.id === spotId);
  if (spot) spot.votes = voteCount;

  broadcastToRoom(code, "vote_changed", {
    spotId,
    votes: voteCount,
    voters,
  });

  return { ok: true, votes: voteCount };
}

export function triggerSpin(code: string, memberId: string): { ok: boolean; seed?: number; result?: Spot[] } {
  const room = rooms.get(code);
  if (!room) return { ok: false };
  if (room.spin?.active) return { ok: false };

  const member = room.members.find((m) => m.id === memberId);
  if (!member) return { ok: false };

  const seed = Date.now() + Math.floor(Math.random() * 10000);
  const ranked = pickBySpin(room.spots, seed);
  const result = ranked.slice(0, 5);

  room.spin = {
    active: true,
    seed,
    triggeredBy: member.name,
    result,
  };

  broadcastToRoom(code, "spin_started", {
    seed,
    triggeredBy: member.name,
    result,
    spots: room.spots,
  });

  // Auto-resolve after animation time (2.5s)
  setTimeout(() => {
    if (room.spin?.active && room.spin.seed === seed) {
      room.spin.active = false;
    }
  }, 3000);

  return { ok: true, seed, result };
}

// ── SSE broadcast ───────────────────────────────────────────────────────
export function addSubscriber(code: string, controller: ReadableStreamDefaultController<Uint8Array>) {
  if (!subscribers.has(code)) subscribers.set(code, new Set());
  subscribers.get(code)!.add(controller);
}

export function removeSubscriber(code: string, controller: ReadableStreamDefaultController<Uint8Array>) {
  const subs = subscribers.get(code);
  if (!subs) return;
  subs.delete(controller);
  if (subs.size === 0) subscribers.delete(code);
}

export function broadcastToRoom(code: string, event: string, data: unknown) {
  const subs = subscribers.get(code);
  if (!subs || subs.size === 0) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoded = encoder.encode(payload);

  for (const controller of subs) {
    try {
      controller.enqueue(encoded);
    } catch {
      // Controller closed, remove it
      subs.delete(controller);
    }
  }
}

// ── Cleanup stale rooms ─────────────────────────────────────────────────
const ROOM_TTL = 4 * 60 * 60 * 1000; // 4 hours

function cleanupStaleRooms() {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.createdAt > ROOM_TTL) {
      rooms.delete(code);
      subscribers.delete(code);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof globalThis !== "undefined") {
  const key = "__lunch_room_cleanup";
  if (!(globalThis as Record<string, unknown>)[key]) {
    (globalThis as Record<string, unknown>)[key] = setInterval(cleanupStaleRooms, 5 * 60 * 1000);
  }
}
