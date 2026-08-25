/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: '#0f172a',
        darker: '#020617',
        neonGreen: '#22c55e',
        neonYellow: '#eab308',
        neonGrey: '#334155'
      }
    },
  },
  plugins: [],
}
