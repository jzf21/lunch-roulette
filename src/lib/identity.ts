"use client";

import React from "react";

export interface Identity {
  id: string;
  name: string;
}

const KEY = "lunch-identity";

function load(): Identity | null {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed.id === "string") return { id: parsed.id, name: String(parsed.name ?? "") };
  } catch {
    // storage blocked or corrupt — fall through to a fresh identity
  }
  return null;
}

function save(identity: Identity) {
  try {
    localStorage.setItem(KEY, JSON.stringify(identity));
  } catch {
    // non-fatal: identity just won't survive a reload
  }
}

// Module-level cache so useSyncExternalStore gets a stable snapshot
let current: Identity | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): Identity {
  if (!current) {
    current = load() ?? { id: crypto.randomUUID(), name: "" };
    save(current);
  }
  return current;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Anonymous per-browser identity for votes and visit logs.
 * `null` during SSR (localStorage is client-only).
 */
export function useIdentity() {
  const identity = React.useSyncExternalStore(subscribe, getSnapshot, () => null);

  const setName = React.useCallback((name: string) => {
    current = { ...getSnapshot(), name: name.slice(0, 60) };
    save(current);
    listeners.forEach((l) => l());
  }, []);

  return { identity, setName };
}
