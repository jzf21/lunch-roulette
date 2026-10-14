import opening_hours from "opening_hours";

export const TIME_ZONE = "Asia/Kolkata";

export type OpenStatus = "open" | "closed" | "unknown";

// Kerala, for public-holiday ("PH") rules
const NOMINATIM = {
  lat: 9.9816,
  lon: 76.2999,
  address: { country_code: "in", state: "Kerala" },
};

/** Wall-clock parts in the office time zone. */
function zonedParts(date: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

/** Today's date in the office time zone, as YYYY-MM-DD. */
export function officeToday(now = new Date()): string {
  const { year, month, day } = zonedParts(now);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * opening_hours evaluates using the process-local clock, so build a Date
 * whose *local* fields equal the office wall-clock time. Optionally pin the
 * time of day (e.g. 13:00 for "open at lunch").
 */
export function officeClock(now = new Date(), at?: { hour: number; minute: number }): Date {
  const p = zonedParts(now);
  return new Date(p.year, p.month - 1, p.day, at?.hour ?? p.hour, at?.minute ?? p.minute);
}

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function hhmm(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * opening_hours.js has no public-holiday data for India and rejects any
 * value mentioning PH, so drop PH selectors ("Mo-Su,PH 10:00-22:00" →
 * "Mo-Su 10:00-22:00", "…; PH off" → "…") and evaluate the rest.
 */
export function stripHolidays(value: string): string {
  return value
    .split(";")
    .map((rule) => rule.replace(/\bPH\s*,\s*/g, "").replace(/\s*,\s*PH\b/g, "").trim())
    .filter((rule) => rule && !/^PH\b/.test(rule))
    .join("; ");
}

const cache = new Map<string, opening_hours | null>();

function parse(value: string): opening_hours | null {
  if (!cache.has(value)) {
    try {
      cache.set(value, new opening_hours(stripHolidays(value), NOMINATIM));
    } catch {
      cache.set(value, null);
    }
  }
  return cache.get(value)!;
}

/**
 * Evaluate an OSM `opening_hours` string at `clock` (from officeClock).
 * `label` describes the next change, e.g. "until 15:30" or "opens Mon 11:00".
 */
export function openState(value: string, clock: Date): { status: OpenStatus; label: string } {
  if (!value) return { status: "unknown", label: "" };
  const oh = parse(value);
  if (!oh) return { status: "unknown", label: "" };

  try {
    if (oh.getUnknown(clock)) return { status: "unknown", label: oh.getComment(clock) ?? "" };
    const open = oh.getState(clock);
    const weekAhead = new Date(clock.getTime() + 7 * 24 * 3600 * 1000);
    const next = oh.getNextChange(clock, weekAhead);
    let label = "";
    if (next) {
      const when = sameDay(next, clock) ? hhmm(next) : `${DAY[next.getDay()]} ${hhmm(next)}`;
      label = open ? `until ${when}` : `opens ${when}`;
    } else if (open) {
      label = "open 24/7";
    }
    return { status: open ? "open" : "closed", label };
  } catch {
    return { status: "unknown", label: "" };
  }
}
