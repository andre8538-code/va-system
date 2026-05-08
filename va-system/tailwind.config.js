/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans:    ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-playfair)", "Georgia", "serif"],
      },
      colors: {
        brand: {
          50:  "#e8eef7",
          100: "#d1ddef",
          500: "#3a6db5",
          700: "#1e4d8c",
          900: "#0f2847",
        },
      },
    },
  },
  plugins: [],
};
