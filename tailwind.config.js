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
        void: '#050507',
        surface: '#0F0F15',
        'fuchsia-accent': '#EC4899',
        'purple-accent': '#8B5CF6',
        'muted-purple': '#1F1F2E',
        'foreground-muted': '#CBD5E1',
      },
    },
  },
  plugins: [],
};
