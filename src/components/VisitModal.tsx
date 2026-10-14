"use client";

import React from "react";
import { INK, ACCENT, CREAM, FONT_DISPLAY, FONT_MONO } from "@/lib/constants";
import { Spot } from "@/lib/types";
import { ChunkyBtn, Field, stickyInput } from "./ui";

interface Visit {
  visited_on: string;
  by_name: string;
  rating: number;
  note: string;
}

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function VisitModal({
  spot,
  identityId,
  name,
  onNameChange,
  onClose,
  onSaved,
}: {
  spot: Spot | null;
  identityId: string;
  name: string;
  onNameChange: (name: string) => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [rating, setRating] = React.useState(0);
  const [hover, setHover] = React.useState(0);
  const [note, setNote] = React.useState("");
  const [date, setDate] = React.useState(localToday);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [history, setHistory] = React.useState<Visit[] | null>(null);

  // The parent remounts this per spot (key), so state starts fresh
  const spotId = spot?.id;
  React.useEffect(() => {
    if (!spotId) return;
    const controller = new AbortController();
    fetch(`/api/visits?spotId=${encodeURIComponent(spotId)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => setHistory(d.visits ?? []))
      .catch(() => {});
    return () => controller.abort();
  }, [spotId]);

  if (!spot) return null;

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spotId: spot.id, byId: identityId, byName: name.trim(), rating, note, visitedOn: date }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not save");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Log a visit to ${spot.name}`}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(26,20,16,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 24,
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(520px, 100%)",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "#C8E7C0",
          border: `3px solid ${INK}`,
          boxShadow: `12px 12px 0 ${INK}`,
          transform: "rotate(0.8deg)",
          position: "relative",
        }}
      >
        <div style={{ padding: "26px 28px 12px", borderBottom: `2.5px dashed ${INK}` }}>
          <div style={{
            fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, letterSpacing: "0.16em",
            textTransform: "uppercase", color: INK, opacity: 0.65,
          }}>
            &#10003; We went to
          </div>
          <h2 style={{ margin: "4px 0 0", fontFamily: FONT_DISPLAY, fontSize: 34, lineHeight: 1, paddingRight: 44 }}>
            {spot.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              position: "absolute", top: 16, right: 16, appearance: "none", width: 36, height: 36,
              border: `2.5px solid ${INK}`, background: CREAM, borderRadius: 999, fontSize: 16,
              cursor: "pointer", boxShadow: `3px 3px 0 ${INK}`, lineHeight: 1,
            }}
          >&#10005;</button>
        </div>

        <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            <Field label="When?">
              <input type="date" value={date} max={localToday()} onChange={(e) => setDate(e.target.value)} style={stickyInput} />
            </Field>
            <Field label="Your name" hint="optional">
              <input type="text" value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="e.g. Anu" style={stickyInput} />
            </Field>
          </div>

          <Field label="How was it?" hint="optional">
            <div style={{ display: "flex", gap: 4 }} onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => {
                const on = (hover || rating) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    aria-pressed={rating === n}
                    onMouseEnter={() => setHover(n)}
                    onClick={() => setRating(rating === n ? 0 : n)}
                    style={{
                      appearance: "none", width: 42, height: 42, border: `2.5px solid ${INK}`,
                      background: on ? "#FFE89B" : CREAM, color: on ? ACCENT : INK,
                      fontSize: 22, lineHeight: 1, cursor: "pointer",
                      boxShadow: on ? `2px 2px 0 ${INK}` : "none",
                    }}
                  >&#9733;</button>
                );
              })}
            </div>
          </Field>

          <Field label="Tips for next time?" hint="shows on the card">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={280}
              rows={3}
              placeholder="Get the fish curry meals. Packed after 1pm."
              style={{ ...stickyInput, resize: "vertical", padding: "10px 12px" }}
            />
          </Field>

          {history && history.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", marginBottom: 6 }}>Previous visits</div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {history.slice(0, 5).map((v, i) => (
                  <li key={i} style={{ fontSize: 12.5, lineHeight: 1.4, borderLeft: `3px solid ${INK}`, paddingLeft: 8 }}>
                    <span style={{ fontFamily: FONT_MONO, fontWeight: 700 }}>{v.visited_on}</span>
                    {v.by_name && <> &middot; {v.by_name}</>}
                    {v.rating > 0 && <span style={{ color: ACCENT }}> {"★".repeat(v.rating)}</span>}
                    {v.note && <div style={{ opacity: 0.8 }}>&ldquo;{v.note}&rdquo;</div>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 28px 24px", borderTop: `2.5px dashed ${INK}`, gap: 12, flexWrap: "wrap",
        }}>
          <span role="status" style={{ fontSize: 12, fontFamily: FONT_MONO, color: error ? ACCENT : INK, opacity: error ? 1 : 0.6 }}>
            {error || "resets the roulette cooldown"}
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <ChunkyBtn onClick={onClose} color={CREAM} fg={INK} size="sm">Cancel</ChunkyBtn>
            <ChunkyBtn onClick={saving ? undefined : submit} size="sm" disabled={saving}>
              {saving ? "Saving…" : "Log it →"}
            </ChunkyBtn>
          </div>
        </div>
      </div>
    </div>
  );
}
