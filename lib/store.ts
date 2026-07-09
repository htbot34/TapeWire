"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AssetClass } from "@/lib/news/types";

export interface NewsSource {
  id: string;
  name: string;
  /** "preloaded" sources ship with the app; "custom" are user-added URLs/@handles. */
  kind: "preloaded" | "custom";
  enabled: boolean;
}

export const DEFAULT_SOURCES: NewsSource[] = [
  { id: "reuters", name: "Reuters", kind: "preloaded", enabled: true },
  { id: "cnbc", name: "CNBC", kind: "preloaded", enabled: true },
  { id: "bloomberg", name: "Bloomberg headlines", kind: "preloaded", enabled: true },
  { id: "forexfactory", name: "ForexFactory calendar", kind: "preloaded", enabled: true },
  { id: "twitter", name: "Twitter/X accounts", kind: "preloaded", enabled: true },
];

export const DEFAULT_WATCHLIST = ["SPY", "QQQ", "NVDA", "TSLA", "AAPL"];
export const DEFAULT_ASSET_CLASSES: AssetClass[] = ["equities", "options"];

interface PrefsState {
  onboarded: boolean;
  assetClasses: AssetClass[];
  watchlist: string[];
  sources: NewsSource[];
  proInterestEmail: string | null;
  _hasHydrated: boolean;

  setOnboarded: (v: boolean) => void;
  toggleAssetClass: (a: AssetClass) => void;
  addSymbol: (s: string) => void;
  removeSymbol: (s: string) => void;
  toggleSource: (id: string) => void;
  addCustomSource: (input: string) => void;
  removeSource: (id: string) => void;
  setProInterestEmail: (email: string) => void;
  applyDefaults: () => void;
  resetAll: () => void;
  setHasHydrated: (v: boolean) => void;
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set, get) => ({
      onboarded: false,
      assetClasses: [],
      watchlist: [],
      sources: DEFAULT_SOURCES,
      proInterestEmail: null,
      _hasHydrated: false,

      setOnboarded: (v) => set({ onboarded: v }),
      toggleAssetClass: (a) =>
        set((s) => ({
          assetClasses: s.assetClasses.includes(a)
            ? s.assetClasses.filter((x) => x !== a)
            : [...s.assetClasses, a],
        })),
      addSymbol: (sym) => {
        const upper = sym.toUpperCase();
        if (get().watchlist.includes(upper)) return;
        set((s) => ({ watchlist: [...s.watchlist, upper] }));
      },
      removeSymbol: (sym) =>
        set((s) => ({ watchlist: s.watchlist.filter((x) => x !== sym) })),
      toggleSource: (id) =>
        set((s) => ({
          sources: s.sources.map((src) =>
            src.id === id ? { ...src, enabled: !src.enabled } : src,
          ),
        })),
      addCustomSource: (input) => {
        const name = input.trim();
        if (!name) return;
        const id = `custom-${name.toLowerCase().replace(/[^a-z0-9@]/g, "-")}`;
        if (get().sources.some((s) => s.id === id)) return;
        set((s) => ({
          sources: [...s.sources, { id, name, kind: "custom", enabled: true }],
        }));
      },
      removeSource: (id) =>
        set((s) => ({ sources: s.sources.filter((src) => src.id !== id) })),
      setProInterestEmail: (email) => set({ proInterestEmail: email }),
      applyDefaults: () =>
        set({
          assetClasses: DEFAULT_ASSET_CLASSES,
          watchlist: DEFAULT_WATCHLIST,
          sources: DEFAULT_SOURCES,
          onboarded: true,
        }),
      resetAll: () =>
        set({
          onboarded: false,
          assetClasses: [],
          watchlist: [],
          sources: DEFAULT_SOURCES,
          proInterestEmail: null,
        }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: "tapewire-prefs",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (s) => ({
        onboarded: s.onboarded,
        assetClasses: s.assetClasses,
        watchlist: s.watchlist,
        sources: s.sources,
        proInterestEmail: s.proInterestEmail,
      }),
    },
  ),
);
