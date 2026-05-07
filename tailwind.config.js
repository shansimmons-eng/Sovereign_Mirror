/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dawn-obsidian': '#0F172A',
        'ultranetic-amber': '#FB923C',
        'radiant-cream': '#FFF7ED',
        'physical-rose': '#F43F5E',
        'healed-sage': '#86EFAC',
        'deprecated-rust': '#DC2626',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'SF Mono', 'Consolas', 'monospace'],
      },
      backdropBlur: {
        'xl': '20px',
      },
      backgroundColor: {
        'glass': 'rgba(255, 255, 255, 0.05)',
        'glass-dark': 'rgba(15, 23, 42, 0.7)',
      },
      borderColor: {
        'glass': 'rgba(255, 255, 255, 0.1)',
      },
    },
  },
  plugins: [],
}