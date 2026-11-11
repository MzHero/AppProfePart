// Genera src/global.css a partir de src/theme/palette.ts.
// Uso: npm run theme   (requiere Node >= 22.18 para importar .ts directamente)
//
// NativeWind (darkMode: 'class') toma `:root` como valores claros y `.dark:root` como oscuros.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { palette } from '../src/theme/palette.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const kebab = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};
const block = (colors) =>
  Object.entries(colors)
    .map(([k, v]) => `  --color-${kebab(k)}: ${rgb(v)}; /* ${v} */`)
    .join('\n');

const css = `/* ARCHIVO GENERADO por scripts/generate-theme-css.mjs — no editar a mano.
   Los colores se cambian en src/theme/palette.ts y después: npm run theme */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
${block(palette.light)}
}

.dark:root {
${block(palette.dark)}
}
`;

writeFileSync(join(root, 'src/global.css'), css);
console.log('src/global.css actualizado');
