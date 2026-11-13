// Filtro de lenguaje ofensivo para los comentarios de las reseñas.
// Es la validación inmediata de la app: la que manda es la del servidor
// (tabla blocked_terms y trigger de reviews en supabase/migrations/20261113000000_*.sql).
// Si agregás un término acá, agregalo también allá (con una migración nueva), y al revés.
//
// Términos normalizados (minúsculas, sin tildes). Un '*' final = cualquier terminación
// (bolud* -> boludo, boluda, boludazo). Se buscan como palabras enteras y toleran letras
// repetidas ("putoooo"), signos entre letras ("p.u.t.o") y números por letras ("1d10t4").
export const BLOCKED_TERMS = [
  'puto', 'puta', 'putos', 'putas', 'putita', 'putito', 'putear', 'puteada',
  'hdp', 'hdps', 'lpm', 'ctm', 'lcdtm',
  'bolud*', 'bolu', 'pelotud*', 'conchud*', 'concha',
  'forro', 'forra', 'forros', 'forras',
  'idiot*', 'imbecil*', 'estupido', 'estupida', 'estupidos', 'estupidas',
  'tarado', 'tarada', 'tarados', 'taradas', 'mogolic*', 'subnormal*',
  'retrasado mental', 'retrasada mental',
  'pajer*', 'choto', 'chota', 'sorete*', 'garca', 'garcas', 'chanta', 'chantas',
  'cagon', 'cagona', 'cagones', 'mierda*', 'cagada', 'cagar', 'cago', 'cagaste',
  'verga', 'pija', 'poronga', 'chupala', 'chupame', 'chupapija*',
  'culo', 'culiad*', 'culead*', 'orto', 'ojete',
  'trolo', 'trola', 'trolos', 'trolas', 'maricon*', 'marica', 'maricas',
  'villero', 'villera', 'villeros', 'villeras',
  'zorra', 'zorras', 'perra', 'cornud*', 'carajo', 'malparid*',
]; // prettier-ignore

const LEET: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', $: 's', '7': 't',
}; // prettier-ignore

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[0134@5$7]/g, (c) => LEET[c]);
}

// Igual que public.blocked_term_pattern() en SQL.
function toPattern(term: string): RegExp {
  const prefix = term.endsWith('*');
  const body = [...term.replace(/\*$/, '')]
    .map((ch) => (ch === ' ' ? '[^a-z]+' : `${ch}+`))
    .join('[._*-]*');
  return new RegExp(`(^|[^a-z])${body}${prefix ? '[a-z]*' : ''}($|[^a-z])`);
}

const PATTERNS = BLOCKED_TERMS.map(toPattern);

/** ¿El texto tiene insultos o lenguaje ofensivo? */
export function hasOffensiveLanguage(text: string): boolean {
  const t = normalize(text);
  return PATTERNS.some((p) => p.test(t));
}

export const OFFENSIVE_LANGUAGE_MESSAGE =
  'Tu comentario tiene palabras ofensivas. Podés contar si no te gustó, pero con respeto.';
