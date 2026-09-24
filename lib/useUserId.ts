"use client";

import { useSyncExternalStore } from "react";
import { getUserId, setUserId } from "./storage";

const USER_EVENT = "br:user-id";

function subscribe(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === "br:user_id") onChange();
  };
  window.addEventListener(USER_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(USER_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

const getServerSnapshot = () => undefined;

/**
 * The climber id saved on this phone.
 * `undefined` = not read yet (server render / hydration), `null` = not joined.
 */
export function useUserId(): string | null | undefined {
  return useSyncExternalStore(subscribe, getUserId, getServerSnapshot);
}

/** setUserId that also tells mounted components about the change. */
export function changeUserId(id: string | null) {
  setUserId(id);
  window.dispatchEvent(new Event(USER_EVENT));
}
