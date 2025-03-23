/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'slamjam': {
          'bg': '#f7f7f7',
          'text': '#1a1a1a',
          'accent': '#ff4d00',
          'muted': '#767676',
          'border': '#e5e5e5',
          'hover': '#f0f0f0',
        }
      },
      fontFamily: {
        'sans': ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      spacing: {
        '128': '32rem',
      },
      gridTemplateColumns: {
        'product': 'repeat(auto-fill, minmax(280px, 1fr))',
      }
    },
  },
  plugins: [],
}
