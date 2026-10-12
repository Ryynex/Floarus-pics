/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#070908",
        surface: "#0E1310",
        "fuchsia-accent": "#10B981",
        "purple-accent": "#34D399",
        "muted-purple": "#1E2C22",
        "foreground-muted": "#94A3B8",
        ink: "#F8FAFC",
        "ink-soft": "#94A3B8",
        "ink-faint": "#64748B",
        line: "#1A261D",
        sand: "#141C16",
        "clay-soft": "#12281A",
        "gold-soft": "#163321",
        sage: "#10B981",
        "sage-soft": "#0C2415",
        brick: "#EF4444",
        "brick-soft": "#291211",
        "amber-warm": "#F59E0B",
        "amber-soft": "#291E0A",
      },
    },
  },
  plugins: [],
};
