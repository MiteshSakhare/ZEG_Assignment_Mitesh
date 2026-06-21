/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "rgba(var(--color-ink), <alpha-value>)",
          deep: "rgba(var(--color-ink-deep), <alpha-value>)",
          line: "rgba(var(--color-ink-line), <alpha-value>)",
        },
        paper: "rgba(var(--color-paper), <alpha-value>)",
        paperDim: "rgba(var(--color-paper-dim), <alpha-value>)",
        survey: "rgba(var(--color-survey), <alpha-value>)",
        buildable: "rgba(var(--color-buildable), <alpha-value>)",
        excluded: "rgba(var(--color-excluded), <alpha-value>)",
        carve: "rgba(var(--color-carve), <alpha-value>)",
        restore: "rgba(var(--color-restore), <alpha-value>)",
        glass: {
          border: "var(--color-glass-border)",
          fill: "var(--color-glass-fill)",
        }
      },
      fontFamily: {
        display: ["'Geist'", "sans-serif"],
        body: ["'Geist'", "sans-serif"],
        mono: ["'Space Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
