// FUENTE ÚNICA de colores de la app (modo claro y oscuro).
//
// Después de cambiar algo acá, correr `npm run theme`: regenera src/global.css con las
// variables CSS que usa NativeWind (className). En JS (iconos, navegación, librerías)
// usar `useAppTheme().colors`.
//
// Tokens semánticos -> clase de Tailwind:
//   background   bg-background        fondo de pantallas
//   surface      bg-surface           tarjetas, headers, tab bar, modales
//   muted        bg-muted             rellenos sutiles (buscador, botón secundario)
//   brandSoft    bg-brand-soft        chips/tags de materia, avatar sin foto
//   line         border-line          bordes y separadores
//   lineBrand    border-line-brand    bordes violeta suave
//   fg           text-fg              texto principal
//   fgMuted      text-fg-muted        texto secundario
//   fgSoft       text-fg-soft         placeholders, ayudas
//   brand        bg-brand / text-brand  violeta principal
//   brandFg      text-brand-fg        texto violeta sobre brand-soft
//   accent       bg-accent            botón primario ("Ingresar"), acciones destructivas
//   accentSoft   bg-accent-soft       fondo del botón X
//   success      text-success         precio, like
//   successSoft  bg-success-soft      fondo del botón corazón
//   star         text-star            estrellas

export const palette = {
  light: {
    background: '#F5F3FF',
    surface: '#FFFFFF',
    muted: '#F5F3FF',
    brandSoft: '#EDE9FE',
    line: '#E2E8F0',
    lineBrand: '#DDD6FE',
    fg: '#1E293B',
    fgMuted: '#64748B',
    fgSoft: '#94A3B8',
    brand: '#6D28D9',
    brandFg: '#6D28D9',
    accent: '#F43F5E',
    accentSoft: '#FEE2E2',
    success: '#10B981',
    successSoft: '#DCFCE7',
    star: '#F59E0B',
  },
  dark: {
    background: '#0F0C1D',
    surface: '#1A1630',
    muted: '#231E3D',
    brandSoft: '#2D2457',
    line: '#2E2950',
    lineBrand: '#3F3473',
    fg: '#F1F0FA',
    fgMuted: '#A9A6C4',
    fgSoft: '#75719A',
    brand: '#8B5CF6',
    brandFg: '#C4B5FD',
    accent: '#F43F5E',
    accentSoft: '#3F1625',
    success: '#34D399',
    successSoft: '#0E2F24',
    star: '#FBBF24',
  },
} as const;

export type ColorSchemeName = keyof typeof palette;
export type ThemeColors = { [K in keyof (typeof palette)['light']]: string };
