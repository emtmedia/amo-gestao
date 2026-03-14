/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50:  '#FFFDF7',
          100: '#FFF9E6',
          200: '#FFF3CC',
          300: '#FFE999',
          400: '#EDD99A',
          500: '#D4BC7A',
          600: '#B8A05E',
          700: '#9A8448',
          800: '#7C6A36',
          900: '#5E5028',
        },
        navy: {
          50:  '#E8EDF5',
          100: '#C5D2E8',
          200: '#9DB2D6',
          300: '#7491C4',
          400: '#4D73B5',
          500: '#2C5A9E',
          600: '#1E4485',
          700: '#12306C',
          800: '#0A2154',
          900: '#071B2E',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
