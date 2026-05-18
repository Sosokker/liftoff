/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0a0a0a',
          elevated: '#161616',
          card: '#1a1a1a',
          hover: '#1f1f1f',
        },
        border: {
          DEFAULT: '#262626',
          light: '#333',
          focus: '#555',
        },
        accent: {
          DEFAULT: '#ff6b6b',
          muted: '#ff6b6b33',
          dim: '#4a2a2a',
        },
        primary: {
          DEFAULT: '#ffffff',
          muted: '#a3a3a3',
          dim: '#737373',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif']
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      }
    }
  },
  plugins: []
}
