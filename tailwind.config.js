/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  important: '#root',
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'system-ui', 'sans-serif'],
      },
      colors: {
        md3: {
          background: '#1C1B1F',
          surface: '#1C1B1F',
          'surface-1': '#2B2930',
          'surface-2': '#2F2E35',
          'surface-3': '#333238',
          'surface-4': '#35343B',
          'surface-5': '#38373E',
          primary: '#D0BCFF',
          'on-primary': '#381E72',
          'primary-container': '#4F378B',
          'on-primary-container': '#EADDFF',
          secondary: '#CCC2DC',
          'on-secondary': '#332D41',
          'secondary-container': '#4A4458',
          'on-secondary-container': '#E8DEF8',
          'on-background': '#E6E1E5',
          'on-surface': '#E6E1E5',
          'on-surface-variant': '#CAC4D0',
          outline: '#938F99',
          'outline-variant': '#49454F',
          error: '#F2B8B5',
          'on-error': '#601410',
          'error-container': '#8C1D18',
          'on-error-container': '#F9DEDC',
        },
      },
    },
  },
  plugins: [],
}
