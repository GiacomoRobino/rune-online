/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        mana: "#4299e1",
        health: "#48bb78",
        attack: "#f56565",
      },
    },
  },
  plugins: [],
};
