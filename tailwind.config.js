/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        ink: {
          900: "#0a0a0b",
          850: "#101012",
          800: "#161618",
          700: "#1f1f22",
          600: "#2a2a2e",
          500: "#3a3a40",
        },
        bone: {
          100: "#f3f1ea",
          300: "#c9c6bd",
          500: "#8f8c84",
        },
      },
    },
  },
  plugins: [],
};
