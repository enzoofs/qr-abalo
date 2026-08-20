/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Bungee', 'system-ui', 'sans-serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
      colors: {
        abalo: {
          coral: '#ff5a3c',
          teal: '#0aa398',
          amber: '#ffb703',
          ink: '#161616',
          paper: '#fdf3e7',
          muted: '#8a8175',
          red: '#e63946',
          green: '#06a77d',
          blue: '#118ab2',
          purple: '#7b2cbf',
        },
      },
      boxShadow: {
        hard: '4px 4px 0 #161616',
        'hard-lg': '7px 7px 0 #161616',
        'hard-teal': '6px 6px 0 #0aa398',
        'hard-sm': '3px 3px 0 rgba(0,0,0,0.35)',
      },
      backgroundImage: {
        halftone:
          'radial-gradient(circle, rgba(255,209,102,0.55) 1.5px, transparent 1.6px)',
      },
    },
  },
  plugins: [],
}
