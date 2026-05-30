import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Wacca ブランドカラー（青緑 teal → 黄色 yellow）
        brand: { DEFAULT: "#0d9488", accent: "#facc15" },
      },
    },
  },
  plugins: [],
} satisfies Config;
