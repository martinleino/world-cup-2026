"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EMPTY_STATE, type AppState } from "./types";

const STORAGE_KEY = "wc2026:state:v1";

function loadFromStorage(): AppState {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      groupResults: parsed.groupResults ?? {},
      knockoutResults: parsed.knockoutResults ?? {},
      manualTies: parsed.manualTies ?? {},
    };
  } catch {
    return EMPTY_STATE;
  }
}

function saveToStorage(state: AppState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota errors etc.
  }
}

export function useAppState() {
  const [state, setState] = useState<AppState>(EMPTY_STATE);
  const [hydrated, setHydrated] = useState(false);
  const skipNextSave = useRef(true);

  useEffect(() => {
    setState(loadFromStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    saveToStorage(state);
  }, [state, hydrated]);

  const reset = useCallback(() => {
    setState(EMPTY_STATE);
  }, []);

  return { state, setState, hydrated, reset };
}
