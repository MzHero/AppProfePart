// Traduce errores de Supabase (Auth, PostgREST, Postgres) a mensajes en español para la UI.

const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email o contraseña incorrectos',
  user_already_exists: 'Ya existe una cuenta con ese email',
  email_exists: 'Ya existe una cuenta con ese email',
  email_not_confirmed: 'Tenés que confirmar tu email antes de ingresar',
  weak_password: 'La contraseña es muy débil',
  over_email_send_rate_limit: 'Demasiados intentos. Probá de nuevo en unos minutos',
  over_request_rate_limit: 'Demasiados intentos. Probá de nuevo en unos minutos',
  session_not_found: 'Tu sesión expiró. Volvé a ingresar',
  user_banned: 'Tu cuenta está suspendida',
};

const PG_MESSAGES: Record<string, string> = {
  '42501': 'No tenés permiso para hacer esto',
  '23505': 'Esto ya existe',
  '23514': 'Algún dato no es válido',
  '22023': 'Algún dato no es válido',
  PGRST116: 'No encontramos lo que buscabas',
};

interface SupabaseLikeError {
  message?: string;
  code?: string;
  name?: string;
}

export function toAppError(e: unknown, fallback = 'Ocurrió un error. Probá de nuevo'): Error {
  if (!e || typeof e !== 'object') return new Error(fallback);
  const err = e as SupabaseLikeError;
  if (err.code && AUTH_MESSAGES[err.code]) return new Error(AUTH_MESSAGES[err.code]);
  // Errores lanzados con mensaje propio desde las funciones SQL (raise exception '...').
  if (err.code === 'P0001' && err.message) return new Error(err.message);
  if (err.code && PG_MESSAGES[err.code]) return new Error(PG_MESSAGES[err.code]);
  if (err.message && /network|fetch/i.test(err.message)) {
    return new Error('Sin conexión. Revisá tu internet y probá de nuevo');
  }
  if (__DEV__) console.warn('[supabase]', err);
  return new Error(fallback);
}

// Genéricos sobre la respuesta completa: las respuestas de supabase-js son uniones
// ({ data: T, error: null } | { data: null, error: E }) y así se infiere bien T.
type Response = { data: unknown; error: unknown };

/** Devuelve los datos; lanza el error traducido si la respuesta trae uno o si vino vacía. */
export function check<R extends Response>(res: R): NonNullable<R['data']> {
  if (res.error) throw toAppError(res.error);
  if (res.data === null || res.data === undefined) {
    throw new Error('No encontramos lo que buscabas');
  }
  return res.data as NonNullable<R['data']>;
}

/** Como check, pero "no encontrado" (null) es un resultado válido. */
export function checkMaybe<R extends Response>(res: R): NonNullable<R['data']> | null {
  if (res.error) throw toAppError(res.error);
  return (res.data ?? null) as NonNullable<R['data']> | null;
}

/** Para operaciones que no devuelven datos (update, delete, RPC void). */
export function checkOk(res: { error: unknown }): void {
  if (res.error) throw toAppError(res.error);
}
