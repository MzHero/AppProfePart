/** @type {import('tailwindcss').Config} */
// Los colores son variables CSS que cambian según el tema (claro/oscuro).
// Valores: src/theme/palette.ts -> `npm run theme` -> src/global.css.
const token = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // 'class' (no 'media'): el tema lo controla AppThemeProvider (sistema / claro / oscuro).
  // Además, con 'media' NativeWind en web dev tira
  // "Cannot manually set color scheme, as dark mode is type 'media'".
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: token('background'),
        surface: token('surface'),
        muted: token('muted'),
        line: { DEFAULT: token('line'), brand: token('line-brand') },
        fg: { DEFAULT: token('fg'), muted: token('fg-muted'), soft: token('fg-soft') },
        brand: { DEFAULT: token('brand'), soft: token('brand-soft'), fg: token('brand-fg') },
        accent: { DEFAULT: token('accent'), soft: token('accent-soft') },
        success: { DEFAULT: token('success'), soft: token('success-soft') },
        star: token('star'),
      },
    },
  },
  plugins: [],
};
