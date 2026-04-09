/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        mono: ['VT323', 'monospace'],
      },
      colors: {
        bg: '#000000',
        fg: '#ffffff',
        accent: '#333333',
        border: '#1a1a1a',
        muted: '#444444',
        success: '#00ff00',
        error: '#ff3333',
        warning: '#ffaa00',
        info: '#00aaff',
      },
    },
  },
  plugins: [],
}
