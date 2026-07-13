import type { Config } from "tailwindcss";

// Palette derived from trading-terminal vernacular: near-black blue-tinted
// ground, muted phosphor teal for interactive chrome, and the universal
// trader impact convention — red for high, clear orange for medium, a
// restrained yellow for low (v4; both verified ≥4.5:1 on the page ground).
// Impact color always travels with a text label, never alone.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0a0e13", // page ground
          900: "#0e131a", // panels
          850: "#121924", // raised surfaces / hover
          800: "#182130", // borders strong
          700: "#1f2a3a", // borders subtle
        },
        text: {
          hi: "#e8edf4",
          // v3 readability pass: secondary text contrast lifted one step —
          // this app sits on a second monitor several feet away.
          mid: "#9db0c4",
          low: "#6b7d93",
        },
        phos: {
          DEFAULT: "#4fb8a6", // muted phosphor teal — the one accent
          dim: "#33776c",
          faint: "#16302d",
        },
        impact: {
          high: "#e5484d",
          highdim: "#7f2a2d",
          med: "#e8823a", // clear orange (contrast ~7.1:1 on ink-950)
          meddim: "#7c4a1e",
          low: "#d6b84a", // restrained yellow (contrast ~10:1 on ink-950)
          lowdim: "#5c4f1f",
        },
        pos: "#4cc38a",
        neg: "#e5484d",
        breaking: {
          bg: "#47121a",
          edge: "#e5484d",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SF Mono",
          "Cascadia Mono",
          "Roboto Mono",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      fontSize: {
        // v3 readability pass: was 0.6875rem — timestamps, sources and chips
        // gain one size step across every row; the density layout is unchanged.
        "2xs": ["0.75rem", { lineHeight: "1.05rem" }],
      },
    },
  },
  plugins: [],
};

export default config;
