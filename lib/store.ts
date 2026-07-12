"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AssetClass, Impact, SourceType, TradingSession } from "@/lib/news/types";

export type TradingStyle = "intraday" | "swing" | "both";

/** Which impact tiers trigger the breaking banner. */
export type AlertSensitivity = "critical" | "critical-relevant" | "everything";

export const SENSITIVITY_IMPACTS: Record<AlertSensitivity, Impact[]> = {
  critical: ["high"],
  "critical-relevant": ["high", "medium"],
  everything: ["high", "medium", "low"],
};

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

/**
 * Translates a prefs source into the UserFilters source criteria the provider
 * understands. Preloaded groups map to whole source types where the group is
 * broader than one outlet; custom sources match by their stored name.
 */
export function sourceFilterFor(source: NewsSource): {
  sourceNames?: string[];
  sourceTypes?: SourceType[];
} {
  switch (source.id) {
    case "reuters":
      return { sourceNames: ["Reuters"] };
    case "cnbc":
      return { sourceNames: ["CNBC"] };
    case "bloomberg":
      return { sourceNames: ["Bloomberg"] };
    case "forexfactory":
      return { sourceTypes: ["econ-calendar"] };
    case "twitter":
      return { sourceTypes: ["social"] };
    default:
      return { sourceNames: [source.name] };
  }
}

interface PrefsState {
  onboarded: boolean;
  assetClasses: AssetClass[];
  watchlist: string[];
  sources: NewsSource[];
  /** When the user trades — flavors Your Focus rationale. */
  tradingSession: TradingSession;
  /** Intraday / swing / both. Stored for the production ranking engine. */
  tradingStyle: TradingStyle;
  /** Which impact tiers take over the banner. Actually gates the banner. */
  alertSensitivity: AlertSensitivity;
  proInterestEmail: string | null;
  /** Pricing fake-door: tiers the user marked interest in ("core"|"pro"|"founding"). */
  proTierInterest: string[];
  /** Audio tick on breaking alerts. Off by default — traders opt in. */
  breakingAudio: boolean;
  /**
   * Focus Alert mode: when ON, Critical events use the full-takeover banner
   * treatment; when OFF (default) they use the readable two-line format.
   */
  focusAlertMode: boolean;
  _hasHydrated: boolean;

  setOnboarded: (v: boolean) => void;
  toggleAssetClass: (a: AssetClass) => void;
  addSymbol: (s: string) => void;
  removeSymbol: (s: string) => void;
  toggleSource: (id: string) => void;
  addCustomSource: (input: string) => void;
  removeSource: (id: string) => void;
  setTradingSession: (s: TradingSession) => void;
  setTradingStyle: (s: TradingStyle) => void;
  setAlertSensitivity: (s: AlertSensitivity) => void;
  setProInterestEmail: (email: string) => void;
  toggleProTierInterest: (tier: string) => void;
  toggleBreakingAudio: () => void;
  toggleFocusAlertMode: () => void;
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
      tradingSession: "new-york",
      tradingStyle: "intraday",
      alertSensitivity: "critical",
      proInterestEmail: null,
      proTierInterest: [],
      breakingAudio: false,
      focusAlertMode: false,
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
      setTradingSession: (v) => set({ tradingSession: v }),
      setTradingStyle: (v) => set({ tradingStyle: v }),
      setAlertSensitivity: (v) => set({ alertSensitivity: v }),
      setProInterestEmail: (email) => set({ proInterestEmail: email }),
      toggleProTierInterest: (tier) =>
        set((s) => ({
          proTierInterest: s.proTierInterest.includes(tier)
            ? s.proTierInterest.filter((t) => t !== tier)
            : [...s.proTierInterest, tier],
        })),
      toggleBreakingAudio: () => set((s) => ({ breakingAudio: !s.breakingAudio })),
      toggleFocusAlertMode: () => set((s) => ({ focusAlertMode: !s.focusAlertMode })),
      applyDefaults: () =>
        set({
          assetClasses: DEFAULT_ASSET_CLASSES,
          watchlist: DEFAULT_WATCHLIST,
          sources: DEFAULT_SOURCES,
          tradingSession: "new-york",
          tradingStyle: "intraday",
          alertSensitivity: "critical",
          onboarded: true,
        }),
      resetAll: () =>
        set({
          onboarded: false,
          assetClasses: [],
          watchlist: [],
          sources: DEFAULT_SOURCES,
          tradingSession: "new-york",
          tradingStyle: "intraday",
          alertSensitivity: "critical",
          proInterestEmail: null,
          proTierInterest: [],
          breakingAudio: false,
          focusAlertMode: false,
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
        tradingSession: s.tradingSession,
        tradingStyle: s.tradingStyle,
        alertSensitivity: s.alertSensitivity,
        proInterestEmail: s.proInterestEmail,
        proTierInterest: s.proTierInterest,
        breakingAudio: s.breakingAudio,
        focusAlertMode: s.focusAlertMode,
      }),
    },
  ),
);
