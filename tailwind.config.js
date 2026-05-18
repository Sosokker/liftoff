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
        primary: {
          DEFAULT: '#06C167',
          50: '#E6F9EF',
          100: '#B3EFD0',
          200: '#80E5B1',
          300: '#4DDB92',
          400: '#1AD173',
          500: '#06C167',
          600: '#059A52',
          700: '#04733E',
          800: '#024D29',
          900: '#012614'
        },
        accent: {
          DEFAULT: '#FF4D00',
          50: '#FFE8E0',
          100: '#FFC2B3',
          200: '#FF9C80',
          300: '#FF764D',
          400: '#FF4D00',
          500: '#E64500',
          600: '#CC3D00',
          700: '#993000',
          800: '#662000',
          900: '#331000'
        },
        dark: {
          bg: '#0F0F0F',
          card: '#1A1A1A',
          surface: '#242424',
          border: '#333333'
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif']
      }
    }
  },
  plugins: []
}
