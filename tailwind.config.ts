import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0A1550", 900: "#070F3A", 700: "#101F78" },
        royal: { DEFAULT: "#1733C4", 400: "#4A66E8", 100: "#E4E9FC" },
        gold: { DEFAULT: "#E8AE0C", 600: "#B98700", 100: "#FBF1CF" },
        paper: "#F5F6FB",
      },
      fontFamily: { display: ["var(--font-display)", "sans-serif"], sans: ["var(--font-body)", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
