/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontSize: {
        'xs': ['0.9375rem', { lineHeight: '1.25rem' }],   // 15px (+3px)
        'sm': ['1.0625rem', { lineHeight: '1.5rem' }],    // 17px (+3px)
        'base': ['1.1875rem', { lineHeight: '1.75rem' }], // 19px (+3px)
        'lg': ['1.3125rem', { lineHeight: '1.875rem' }],  // 21px (+3px)
        'xl': ['1.4375rem', { lineHeight: '2rem' }],      // 23px (+3px)
        '2xl': ['1.6875rem', { lineHeight: '2.25rem' }],  // 27px (+3px)
        '3xl': ['2.0625rem', { lineHeight: '2.5rem' }],   // 33px (+3px)
        '4xl': ['2.4375rem', { lineHeight: '2.75rem' }],  // 39px (+3px)
        '5xl': ['3.1875rem', { lineHeight: '1' }],        // 51px (+3px)
      },
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
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [],
}
