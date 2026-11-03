import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Quincaillerie Soleil — bright, sunny, friendly ───────────────
        // Text (warm near-black — used for ink, never as big dark surfaces)
        ink: "#2B2521",
        "ink-soft": "#5C544C",
        muted: "#8A8079",        // tertiary text / mono labels
        steel: "#8A8079",        // alias kept for legacy mono labels

        // Bright surfaces
        snow: "#FFFFFF",         // pure white cards
        sun: "#FFFDF8",          // sunny warm-white page base
        cloud: "#FFFDF8",        // alias → page base
        cream: "#FFF6E9",        // warm card tint
        mist: "#FBF5EC",         // soft alternating surface
        // Cheerful section tints
        peach: "#FFEAD8",
        mint: "#E4F6EC",
        "sky-tint": "#E5F2FB",
        butter: "#FFF3D2",
        line: "#F1E8DB",         // warm hairline borders
        "line-strong": "#E7DCC9",

        // Heritage orange — primary signature accent (brightened)
        amber: "#FF6A1A",
        "amber-deep": "#E8500B",
        "amber-soft": "#FFB078",
        "amber-tint": "#FFEEE0",

        // Building green — secondary accent (growth, a nod to CI)
        green: "#16A34A",
        "green-deep": "#0F7A38",
        "green-soft": "#7FDDA6",
        "green-tint": "#E4F6EC",

        // Fresh azure — tertiary accent
        azure: "#2BA8CC",
        "azure-deep": "#1C84A3",
        "azure-soft": "#8FD6E8",
        "azure-tint": "#E5F2FB",

        // Sunny highlights
        yellow: "#FFC233",
        berry: "#E8487A",        // playful pink (rayon accent)
        grape: "#8B5CF6",        // playful purple (rayon accent)

        // Futuristic cool accents — used in gradients, glows & glass
        violet: "#7C5CFF",
        "violet-deep": "#5B3DF5",
        cyan: "#22D3EE",
        "cyan-deep": "#0EA5C4",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        // Soft, lifted, friendly shadows (warm-tinted, never heavy)
        soft: "0 1px 2px rgba(43,37,33,0.03), 0 10px 24px -16px rgba(43,37,33,0.16)",
        card: "0 1px 2px rgba(43,37,33,0.03), 0 14px 32px -20px rgba(43,37,33,0.18)",
        "card-hover": "0 4px 10px rgba(43,37,33,0.05), 0 28px 54px -22px rgba(255,106,26,0.30)",
        lift: "0 26px 60px -22px rgba(43,37,33,0.26)",
        // Colorful glows
        glow: "0 16px 40px -14px rgba(255,106,26,0.45)",
        "glow-strong": "0 22px 60px -16px rgba(255,106,26,0.60)",
        "glow-green": "0 16px 40px -14px rgba(22,163,74,0.40)",
        "glow-violet": "0 16px 44px -14px rgba(124,92,255,0.50)",
        // Frosted glass surfaces (futuristic) — soft depth + inner highlight
        glass: "0 8px 32px -10px rgba(27,26,34,0.20), inset 0 1px 0 rgba(255,255,255,0.7)",
        "glass-lg": "0 24px 60px -20px rgba(27,26,34,0.30), inset 0 1px 0 rgba(255,255,255,0.7)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        nudge: {
          "0%, 100%": { transform: "translateY(0)", opacity: "0.5" },
          "50%": { transform: "translateY(6px)", opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-9px)" },
        },
        // Slow, organic drift for the background blobs
        blob: {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(24px, -28px) scale(1.06)" },
          "66%": { transform: "translate(-20px, 18px) scale(0.96)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.45", transform: "scale(1)" },
          "50%": { opacity: "0.75", transform: "scale(1.05)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        // Sunny moving gradient for the hero headline accent
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        pop: {
          "0%": { opacity: "0", transform: "scale(0.8)" },
          "70%": { transform: "scale(1.05)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.22,1,0.36,1) both",
        marquee: "marquee 32s linear infinite",
        nudge: "nudge 1.8s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        blob: "blob 18s ease-in-out infinite",
        "pulse-glow": "pulse-glow 7s ease-in-out infinite",
        shimmer: "shimmer 6s linear infinite",
        "gradient-x": "gradient-x 6s ease infinite",
        pop: "pop 0.5s cubic-bezier(0.22,1,0.36,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
