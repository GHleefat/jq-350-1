/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        'lab-bg': '#0a0a1a',
        'lab-panel': 'rgba(20, 20, 40, 0.85)',
        'lab-border': 'rgba(0, 245, 255, 0.2)',
        'lab-cyan': '#00f5ff',
        'lab-amber': '#ffaa00',
        'lab-pink': '#ff00aa',
        'lab-green': '#00ff88',
      },
      fontFamily: {
        'mono': ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 245, 255, 0.4)',
        'glow-amber': '0 0 20px rgba(255, 170, 0, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
