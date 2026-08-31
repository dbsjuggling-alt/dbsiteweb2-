/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'Roboto', 'system-ui', 'sans-serif'],
      },
      colors: {
        dbs: {
          dark: '#1d1e20',
          black: '#18181a',
          gray: '#727586',
          'gray-light': '#f2f3f6',
          'gray-border': '#dadce0',
          purple: '#673de6',
          'purple-dark': '#5025d1',
          'purple-light': '#ebe4ff',
        },
      },
    },
  },
  plugins: [],
};