/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: '#0B1118',
        panel: '#121B25',
        card: '#1A2634',
        border: '#2A3A4D',
        text: '#E6EDF3',
        muted: '#8FA3B8',
        accent: '#22D3EE',
        friendly: '#3B9EFF',
        hostile: '#FF6B3D',
        neutral: '#9DB4C0',
        unknown: '#FACC15',
        instructor: '#34D399',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
