/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: '#1C2116',
        panel: '#262D1E',
        card: '#323A27',
        border: '#4A5538',
        text: '#E8E4D0',
        muted: '#A9A98A',
        accent: '#C8B560',
        sand: '#B5A272',
        stamp: '#C0392B',
        friendly: '#4DA3FF',
        hostile: '#FF5A36',
        neutral: '#C9CFC0',
        unknown: '#FFD43B',
        delayed: '#F59E0B',
        corrupted: '#E879F9',
        conflicting: '#A78BFA',
        instructor: '#2DD4BF',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        stencil: ['Black Ops One', 'Stardos Stencil', 'cursive'],
      },
      backgroundImage: {
        'camo': "url('/camo.svg')",
      }
    },
  },
  plugins: [],
}
