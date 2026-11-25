/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        paper: '#F7F5F0',
        surface: '#FFFFFF',
        ink: '#172A2A',
        secondary: '#50645F',
        muted: '#6C7C76',
        line: '#DCE2DC',
        accent: '#006B62',
        accentSoft: '#E2F1EA',
        danger: '#A73532',
      },
    },
  },
  plugins: [],
};
