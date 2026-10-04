/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core Semantic Tokens mapped to the exact 9-color palette
        base: '#000000',       // #000000 -> Pure Black
        panel: '#3C3C3D',      // #3C3C3D -> Charcoal Gray
        card: '#3C3C3D',       // #3C3C3D -> Charcoal Gray
        border: '#4B5320',     // #4B5320 -> Army Green
        text: '#B0C4DE',       // #B0C4DE -> Light Steel Blue
        muted: '#A9A9A9',      // #A9A9A9 -> Dark Gray / Silver
        accent: '#FFD700',     // #FFD700 -> Gold
        sand: '#B0C4DE',       // #B0C4DE -> Light Steel Blue
        stamp: '#8B4513',      // #8B4513 -> Saddle Brown
        friendly: '#6B8E23',   // #6B8E23 -> Olive Drab
        hostile: '#8B4513',    // #8B4513 -> Saddle Brown
        neutral: '#A9A9A9',    // #A9A9A9 -> Silver Gray
        unknown: '#FFD700',    // #FFD700 -> Gold
        delayed: '#FFD700',    // #FFD700 -> Gold
        corrupted: '#8B4513',  // #8B4513 -> Saddle Brown
        conflicting: '#FFD700',// #FFD700 -> Gold
        instructor: '#FFD700', // #FFD700 -> Gold

        // Explicit 9-Color Palette Tokens
        pureBlack: '#000000',
        charcoal: '#3C3C3D',
        oliveDrab: '#6B8E23',
        armyGreen: '#4B5320',
        silverGray: '#A9A9A9',
        steelBlue: '#B0C4DE',
        saddleBrown: '#8B4513',
        slateGray: '#2F4F4F',
        gold: '#FFD700',
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
