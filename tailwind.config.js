/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0D6E4F',
        'primary-dark': '#095A42',
        'primary-light': '#E8F5F0',
        'bg-main': '#F8FAF9',
        'text-dark': '#1A2E23',
        'text-muted': '#6B7C74',
        border: '#E2E8E5',
        gain: '#10B981',
        loss: '#EF4444',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
