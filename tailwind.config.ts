import type { Config } from "tailwindcss";

// Palette derived from trading-terminal vernacular: near-black blue-tinted
// ground, muted phosphor teal for interactive chrome, saturated red reserved
// strictly for high-impact/breaking, desaturated amber for medium.
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
          med: "#c9974a",
          meddim: "#6e5527",
          low: "#5c6b7f",
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
