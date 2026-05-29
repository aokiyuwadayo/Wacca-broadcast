import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // YUWA ブランドカラー（indigo-600 + amber-500）
        brand: { DEFAULT: "#4f46e5", accent: "#f59e0b" },
      },
    },
  },
  plugins: [],
} satisfies Config;
