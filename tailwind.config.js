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
        void: "#14100C",
        surface: "#1F1A15",
        "fuchsia-accent": "#D4784A",
        "purple-accent": "#D4A84B",
        "muted-purple": "#3A322A",
        "foreground-muted": "#B5A898",
        ink: "#F3EBE0",
        "ink-soft": "#B5A898",
        "ink-faint": "#8A7D6E",
        line: "#3A322A",
        sand: "#2A241C",
        "clay-soft": "#3D2E24",
        "gold-soft": "#3A3020",
        sage: "#8FB575",
        "sage-soft": "#24301C",
        brick: "#D47A6E",
        "brick-soft": "#3A2220",
        "amber-warm": "#D4A04A",
        "amber-soft": "#3A2E18",
      },
    },
  },
  plugins: [],
};
