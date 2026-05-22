import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Premium nautical palette pulled from the Krekelberg designs
        navy: {
          50: '#f4f6f8',
          100: '#e6eaef',
          200: '#c4cdd8',
          300: '#9aa9bb',
          400: '#5f7591',
          500: '#3a5476',
          600: '#243d5e',
          700: '#1a2e48',
          800: '#142336',
          900: '#0f1b2a',
          950: '#0a121c',
        },
        sand: {
          50: '#fbf8f3',
          100: '#f5efe2',
          200: '#ecdfc5',
          300: '#decb9d',
          400: '#cdb275',
          500: '#bf9c54',
          600: '#a5823f',
          700: '#836635',
          800: '#6c5330',
          900: '#59452a',
        },
        gold: {
          50: '#fbf6ed',
          100: '#f3e6c7',
          200: '#e8cf90',
          300: '#dbb55a',
          400: '#cf9d3a',
          500: '#bd8528',
          600: '#a06a20',
          700: '#7e4f1e',
          800: '#683f1f',
          900: '#58351c',
        },
        marine: {
          50: '#eef9fc',
          100: '#d4f0f8',
          200: '#a8e0f0',
          300: '#71cae3',
          400: '#3aafd0',
          500: '#1f93b8',
          600: '#19759a',
          700: '#185c7c',
          800: '#194d66',
          900: '#194056',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(15, 27, 42, 0.04), 0 4px 16px -4px rgba(15, 27, 42, 0.08)',
        elev: '0 8px 30px -8px rgba(15, 27, 42, 0.18)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};

export default config;
