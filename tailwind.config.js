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
        sidebar: {
          bg: '#1a1f2e',
          hover: '#252c3f',
          active: '#2d3650',
          text: '#94a3b8',
          activeText: '#e2e8f0',
        },
      },
    },
  },
  plugins: [],
}
