/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aviation: {
          bg: '#070b12',
          surface: '#0d1522',
          card: '#121c2d',
          cardHover: '#182438',
          border: '#1e2f47',
          borderLight: '#2a3f5f',
          text: '#e2e8f0',
          muted: '#8497b0',
          cyan: '#00e5ff',
          blue: '#2563eb',
          sky: '#38bdf8',
          amber: '#f59e0b',
          amberDark: '#b45309',
          red: '#ef4444',
          redDark: '#991b1b',
          green: '#10b981',
          greenDark: '#047857',
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
