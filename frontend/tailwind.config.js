import colors from 'tailwindcss/colors'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Small, consistent palette: primary for actions, slate for text/surfaces.
      // Plain blue - a simple, student-chosen accent color.
      colors: {
        primary: colors.blue,
      },
      fontFamily: {
        sans: [
          'Segoe UI',
          'system-ui',
          '-apple-system',
          'Roboto',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
