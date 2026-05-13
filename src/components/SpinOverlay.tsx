"use client";

import React from "react";
import { INK, ACCENT, CREAM, FONT_DISPLAY, FONT_MONO } from "@/lib/constants";
import { Spot } from "@/lib/types";
import { ChunkyBtn } from "./ui";

function FlickerChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        background: CREAM,
        border: `2px solid ${INK}`,
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.04em",
        color: INK,
        maxWidth: 180,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {children}
    </span>
  );
}

function Dots() {
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setN((x) => (x + 1) % 4), 280);
    return () => clearInterval(id);
  }, []);
  return <span style={{ display: "inline-block", width: 18, textAlign: "left" }}>{".".repeat(n)}</span>;
}

function Confetti() {
  const pieces = React.useMemo(
    () =>
      Array.from({ length: 28 }).map((_, i) => ({
        x: (i / 28) * 100 + (Math.random() * 4 - 2),
        delay: Math.random() * 0.35,
        dx: (Math.random() * 80 - 40) + "px",
        color: ["#FFE89B", "#FFCDE0", "#C8E7C0", "#D6CCFF", "#FF4D2E"][i % 5],
        rot: Math.random() * 360,
        size: 10 + Math.random() * 10,
      })),
    [],
  );
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            top: 0,
            left: `${p.x}%`,
            width: p.size,
            height: p.size * 0.6,
            background: p.color,
            border: `1.5px solid ${INK}`,
            transform: `rotate(${p.rot}deg)`,
            animation: `confetti-fall 1.1s ${p.delay}s cubic-bezier(.2,.6,.5,1) both`,
            "--x": p.dx,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export function SpinOverlay({
  spots,
  finalists,
  onDone,
  onSpinAgain,
}: {
  spots: Spot[];
  finalists: Spot[];
  onDone: () => void;
  onSpinAgain: () => void;
}) {
  const [tick, setTick] = React.useState(0);
  const [phase, setPhase] = React.useState<"spinning" | "reveal">("spinning");

  const pool = React.useMemo(() => spots.map((s) => s.name), [spots]);

  React.useEffect(() => {
    let raf: number;
    let last = performance.now();
    const start = performance.now();
    const TOTAL = 2200;
    const tickLoop = (now: number) => {
      const t = Math.min(1, (now - start) / TOTAL);
      const interval = 55 + 200 * t * t;
      if (now - last >= interval) {
        setTick((x) => x + 1);
        last = now;
      }
      if (t < 1) {
        raf = requestAnimationFrame(tickLoop);
      } else {
        setPhase("reveal");
      }
    };
    raf = requestAnimationFrame(tickLoop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const flicker = (offset: number) => {
    const idx = (tick + offset) % pool.length;
    return pool[idx];
  };

  const top3 = finalists.slice(0, 3);

  return (
    <div
      onClick={(e) => {
        if (phase === "reveal" && e.target === e.currentTarget) onDone();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        background: "rgba(255, 241, 198, 0.92)",
        backgroundImage:
          "radial-gradient(rgba(26,20,16,0.10) 1.5px, transparent 1.5px)",
        backgroundSize: "22px 22px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
        padding: 24,
        animation: "overlay-in 220ms ease-out both",
        cursor: phase === "reveal" ? "pointer" : "default",
      }}
    >
      {/* Tape strip */}
      <div
        style={{
          position: "absolute",
          top: 38,
          left: "50%",
          transform: "translateX(-50%) rotate(-1.5deg)",
          background: "#FFE89B",
          border: `2.5px solid ${INK}`,
          boxShadow: `4px 4px 0 ${INK}`,
          padding: "8px 22px",
          fontFamily: FONT_MONO,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: INK,
          whiteSpace: "nowrap",
        }}
      >
        {phase === "spinning" ? "\u2605 Spinning the wheel \u2605" : "\u2605 Today's verdict \u2605"}
      </div>

      {/* The wheel + pointer */}
      <div style={{ position: "relative", width: 320, height: 320 }}>
        {/* Pulsing aura */}
        <div
          style={{
            position: "absolute",
            inset: -22,
            border: `2.5px dashed ${INK}`,
            borderRadius: "50%",
            opacity: 0.35,
            animation: "ring-pulse 1.2s ease-in-out infinite",
          }}
        />
        {/* Pointer */}
        <div
          style={{
            position: "absolute",
            top: -22,
            left: "50%",
            transform: "translateX(-50%)",
            width: 36,
            height: 46,
            zIndex: 3,
            animation: phase === "spinning" ? "pointer-tap 110ms steps(2, end) infinite" : "none",
            transformOrigin: "50% 90%",
          }}
        >
          <svg viewBox="0 0 36 46" width="36" height="46">
            <path
              d="M18 44 L4 8 Q18 -2 32 8 Z"
              fill={ACCENT}
              stroke={INK}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <circle cx="18" cy="10" r="3" fill={INK} />
          </svg>
        </div>

        {/* Spinning wheel disc */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `2.5px solid ${INK}`,
            boxShadow: `6px 6px 0 ${INK}`,
            background:
              "conic-gradient(" +
              [
                "#FFE89B 0deg 45deg",
                "#FFCDE0 45deg 90deg",
                "#C8E7C0 90deg 135deg",
                "#D6CCFF 135deg 180deg",
                "#FFE89B 180deg 225deg",
                "#FFCDE0 225deg 270deg",
                "#C8E7C0 270deg 315deg",
                "#D6CCFF 315deg 360deg",
              ].join(", ") +
              ")",
            animation:
              phase === "spinning"
                ? "wheel-spin 2.2s cubic-bezier(.18,.7,.25,1) both"
                : "none",
            transform: phase === "reveal" ? "rotate(2160deg)" : undefined,
            display: "grid",
            placeItems: "center",
          }}
        >
          {/* Slice spokes */}
          <svg
            viewBox="0 0 100 100"
            width="100%"
            height="100%"
            style={{ position: "absolute", inset: 0 }}
          >
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (i / 8) * Math.PI * 2;
              const x = 50 + Math.cos(a) * 50;
              const y = 50 + Math.sin(a) * 50;
              return (
                <line
                  key={i}
                  x1="50"
                  y1="50"
                  x2={x}
                  y2={y}
                  stroke={INK}
                  strokeWidth="0.8"
                />
              );
            })}
          </svg>
          {/* Wheel hub */}
          <div
            style={{
              width: 78,
              height: 78,
              borderRadius: "50%",
              background: CREAM,
              border: `2.5px solid ${INK}`,
              display: "grid",
              placeItems: "center",
              fontFamily: FONT_DISPLAY,
              fontSize: 42,
              color: ACCENT,
              boxShadow: `inset 0 0 0 4px ${CREAM}, 0 0 0 0 ${INK}`,
              zIndex: 2,
            }}
          >
            &#8635;
          </div>
        </div>

        {/* Floating stickers */}
        <div
          style={{
            position: "absolute",
            top: -8,
            right: -40,
            background: "#D6CCFF",
            border: `2.5px solid ${INK}`,
            boxShadow: `3px 3px 0 ${INK}`,
            padding: "5px 12px",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            transform: "rotate(8deg)",
          }}
        >
          fate is rolling
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 6,
            left: -52,
            background: "#C8E7C0",
            border: `2.5px solid ${INK}`,
            boxShadow: `3px 3px 0 ${INK}`,
            padding: "5px 12px",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            transform: "rotate(-9deg)",
          }}
        >
          no take-backs
        </div>
      </div>

      {/* Flicker ticker / reveal */}
      <div
        style={{
          minHeight: 130,
          width: "min(680px, 92vw)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
        }}
      >
        {phase === "spinning" ? (
          <>
            <div
              key={tick}
              style={{
                background: CREAM,
                border: `2.5px solid ${INK}`,
                boxShadow: `6px 6px 0 ${INK}`,
                padding: "14px 28px",
                fontFamily: FONT_DISPLAY,
                fontSize: "clamp(28px, 5vw, 44px)",
                lineHeight: 1,
                color: INK,
                animation: "ticker-shake 110ms ease-in-out",
                maxWidth: "92vw",
                textAlign: "center",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {flicker(0)}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 6, opacity: 0.7 }}>
              <FlickerChip>{flicker(2)}</FlickerChip>
              <FlickerChip>{flicker(5)}</FlickerChip>
              <FlickerChip>{flicker(7)}</FlickerChip>
            </div>
            <div
              style={{
                marginTop: 14,
                fontFamily: FONT_MONO,
                fontSize: 12,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: INK,
                opacity: 0.55,
              }}
            >
              consulting the lunch gods<Dots />
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                fontFamily: FONT_MONO,
                fontSize: 12,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: INK,
                opacity: 0.6,
              }}>
              the wheel landed on
            </div>
            <div
              style={{
                display: "flex",
                gap: 14,
                flexWrap: "wrap",
                justifyContent: "center",
                marginTop: 4,
              }}
            >
              {top3.map((s, i) => (
                <div
                  key={s.id}
                  style={{
                    background: ["#FFE89B", "#FFCDE0", "#C8E7C0"][i],
                    border: `2.5px solid ${INK}`,
                    boxShadow: `5px 5px 0 ${INK}`,
                    padding: "10px 18px",
                    fontFamily: FONT_DISPLAY,
                    fontSize: "clamp(20px, 3vw, 30px)",
                    lineHeight: 1,
                    color: INK,
                    transform: `rotate(${[-2, 1.5, -1][i]}deg)`,
                    animation: `sticker-pop 380ms ${i * 90}ms cubic-bezier(.3,1.5,.5,1) both`,
                  }}
                >
                  <span style={{
                    fontFamily: FONT_MONO,
                    fontSize: 12,
                    color: ACCENT,
                    marginRight: 8,
                    verticalAlign: "0.18em",
                  }}>#{i + 1}</span>
                  {s.name}
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 22,
                flexWrap: "wrap",
                justifyContent: "center",
                animation: "sticker-pop 380ms 400ms cubic-bezier(.3,1.5,.5,1) both",
              }}
            >
              <ChunkyBtn onClick={onDone} size="lg" color={ACCENT} fg={CREAM}>
                Let&apos;s eat!
              </ChunkyBtn>
              <ChunkyBtn onClick={onSpinAgain} size="lg" color={CREAM} fg={INK}>
                <span style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 20, lineHeight: 1, marginRight: 6,
                }}>&#8635;</span>
                Spin again
              </ChunkyBtn>
            </div>
            <div
              style={{
                marginTop: 10,
                fontFamily: FONT_MONO,
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: INK,
                opacity: 0.45,
              }}
            >
              tap anywhere to dismiss
            </div>
          </>
        )}
      </div>

      {phase === "reveal" && <Confetti />}
    </div>
  );
}
