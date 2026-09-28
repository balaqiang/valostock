"use client";

import { useEffect, useSyncExternalStore } from "react";
import { apiFetch } from "@/lib/api";
import type { PublicUser } from "@/types/api";

export type SessionState =
  | { status: "loading"; user: null }
  | { status: "ready"; user: PublicUser | null };

const LOADING: SessionState = { status: "loading", user: null };

// One shared session snapshot for every component on the page.
let state: SessionState = LOADING;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function setSessionUser(user: PublicUser | null) {
  state = { status: "ready", user };
  emit();
}

export function refreshSession(): Promise<void> {
  inflight ??= apiFetch<{ user: PublicUser | null }>("/api/auth/me", { cache: "no-store" })
    .then((data) => setSessionUser(data.user ?? null))
    .catch(() => setSessionUser(null))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSession(): SessionState {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => LOADING,
  );
  useEffect(() => {
    if (state.status === "loading") void refreshSession();
  }, []);
  return snapshot;
}
