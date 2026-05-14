"use client";

import React from "react";
import { INK, ACCENT, CREAM, SURFACE, FONT_DISPLAY, FONT_MONO, ALL_CUISINES, TEAM } from "@/lib/constants";
import { Spot } from "@/lib/types";
import { ChunkyBtn, Initials, Field, stickyInput } from "./ui";

export function AddModal({
  open,
  onClose,
  onAdd,
  memberName,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (spot: Spot) => void;
  memberName?: string;
}) {
  const initials = memberName ? memberName.slice(0, 2).toUpperCase() : "";
  const [form, setForm] = React.useState({
    name: "", cuisine: "", area: "", walk: 10, price: 2, by: initials, notes: "",
  });

  React.useEffect(() => {
    if (!open) setForm({ name: "", cuisine: "", area: "", walk: 10, price: 2, by: memberName ? memberName.slice(0, 2).toUpperCase() : "", notes: "" });
  }, [open, memberName]);

  if (!open) return null;
  const valid = form.name.trim() && form.cuisine.trim() && form.area.trim();
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string | number) => {
    const val = typeof e === "object" && e !== null && "target" in e ? e.target.value : e;
    setForm((f) => ({ ...f, [k]: val }));
  };

  const submit = () => {
    onAdd({
      id: form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36),
      name: form.name.trim(),
      cuisine: form.cuisine.split(",").map((s) => s.trim()).filter(Boolean),
      area: form.area.trim(),
      walk: Number(form.walk),
      price: Number(form.price),
      votes: 1,
      lastVisited: "never",
      cooldown: 999,
      by: form.by,
      byName: memberName || TEAM.find((m) => m.initials === form.by)?.name || form.by,
      notes: form.notes.trim() || "no notes yet \u2014 first try is on you.",
      tags: [],
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
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
          width: "min(580px, 100%)",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "#FFE89B",
          border: `3px solid ${INK}`,
          boxShadow: `12px 12px 0 ${INK}`,
          transform: "rotate(-1.2deg)",
          position: "relative",
        }}
      >
        {/* Tape piece */}
        <div style={{
          position: "absolute",
          top: -14, left: "40%",
          width: 80, height: 26,
          background: "rgba(255,77,46,0.55)",
          border: `2px solid ${INK}`,
          transform: "rotate(-4deg)",
        }} />

        {/* Header */}
        <div style={{ padding: "26px 28px 12px", borderBottom: `2.5px dashed ${INK}` }}>
          <div style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: INK,
            opacity: 0.65,
          }}>
            &#9733; New lunch spot
          </div>
          <h2 style={{
            margin: "4px 0 0",
            fontFamily: FONT_DISPLAY,
            fontSize: 38,
            lineHeight: 1,
            letterSpacing: "-0.01em",
          }}>
            Tell us where!
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              position: "absolute",
              top: 16, right: 16,
              appearance: "none",
              width: 36, height: 36,
              border: `2.5px solid ${INK}`,
              background: CREAM,
              borderRadius: 999,
              fontSize: 16,
              cursor: "pointer",
              boxShadow: `3px 3px 0 ${INK}`,
              lineHeight: 1,
            }}
          >&#10005;</button>
        </div>

        {/* Body */}
        <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 18 }}>
          <Field label="What's it called?" required>
            <input type="text" value={form.name} onChange={set("name")}
              placeholder="e.g. Oceanos"
              style={stickyInput} />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Cuisine" required hint="comma-separated">
              <input type="text" value={form.cuisine} onChange={set("cuisine")}
                placeholder="Seafood, Kerala"
                list="cuisine-list" style={stickyInput} />
              <datalist id="cuisine-list">
                {ALL_CUISINES.map((c) => <option key={c} value={c} />)}
              </datalist>
            </Field>
            <Field label="Where?" required>
              <input type="text" value={form.area} onChange={set("area")}
                placeholder="Marine Drive" style={stickyInput} />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label={`How far? \u00b7 ${form.walk} min`} hint="walk from office">
              <input type="range" min={1} max={45} value={form.walk}
                onChange={set("walk")}
                style={{ width: "100%", accentColor: ACCENT, height: 6 }} />
            </Field>
            <Field label="Price?">
              <div style={{ display: "flex", gap: 6 }}>
                {[1, 2, 3].map((p) => {
                  const on = form.price === p;
                  return (
                    <button key={p} type="button"
                      onClick={() => setForm((f) => ({ ...f, price: p }))}
                      style={{
                        flex: 1,
                        padding: "10px 0",
                        border: `2.5px solid ${INK}`,
                        background: on ? INK : CREAM,
                        color: on ? CREAM : INK,
                        fontFamily: FONT_MONO,
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                        boxShadow: on ? `inset 0 0 0 ${INK}` : `2px 2px 0 ${INK}`,
                      }}>
                      {"\u20B9".repeat(p)}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>

          <Field label="Got tips?" hint="what to order, when to go\u2026">
            <textarea value={form.notes} onChange={set("notes")}
              placeholder="Crowded after 1pm. Try the karimeen."
              rows={3}
              style={{ ...stickyInput, resize: "vertical", padding: "10px 12px" }} />
          </Field>

          <Field label="Who's suggesting?">
            {memberName ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Initials size={28} accent>{memberName.slice(0, 2).toUpperCase()}</Initials>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{memberName}</span>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {TEAM.map((m) => {
                  const on = form.by === m.initials;
                  return (
                    <button key={m.initials} type="button"
                      onClick={() => setForm((f) => ({ ...f, by: m.initials }))}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "4px 12px 4px 4px",
                        border: `2.5px solid ${INK}`,
                        background: on ? ACCENT : CREAM,
                        color: on ? CREAM : INK,
                        borderRadius: 999,
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                        boxShadow: on ? `3px 3px 0 ${INK}` : "none",
                      }}>
                      <Initials size={24} accent={on}>{m.initials}</Initials>
                      {m.name}
                    </button>
                  );
                })}
              </div>
            )}
          </Field>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 28px 24px",
          borderTop: `2.5px dashed ${INK}`,
          gap: 12,
        }}>
          <span style={{ fontSize: 12, fontFamily: FONT_MONO, opacity: 0.6 }}>
            {valid ? "looks good \u2192" : "fill the required bits"}
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <ChunkyBtn onClick={onClose} color={CREAM} fg={INK} size="sm">Cancel</ChunkyBtn>
            <ChunkyBtn onClick={valid ? submit : undefined}
              color={valid ? ACCENT : "rgba(26,20,16,0.15)"} fg={valid ? CREAM : "rgba(26,20,16,0.4)"} size="sm"
              style={{ cursor: valid ? "pointer" : "not-allowed" }}>
              Add it! &rarr;
            </ChunkyBtn>
          </div>
        </div>
      </div>
    </div>
  );
}
