import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Ingresá tu email').email('Email inválido'),
  password: z.string().min(1, 'Ingresá tu contraseña'),
});
export type LoginForm = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Ingresá tu nombre'),
    email: z.string().trim().min(1, 'Ingresá tu email').email('Email inválido'),
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirmPassword: z.string(),
    role: z.enum(['student', 'teacher']),
    acceptTerms: z.boolean().refine((v) => v, 'Tenés que aceptar los términos'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  });
export type RegisterForm = z.infer<typeof registerSchema>;

/** 'DD/MM/AAAA' que exista en el calendario, entre 1920 y hoy. */
function isValidPastDate(v: string): boolean {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
  if (!m) return false;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === mo - 1 &&
    date.getDate() === d &&
    y >= 1920 &&
    date < new Date()
  );
}

// Los inputs de texto entregan strings; los campos numéricos se validan como texto
// y se convierten al guardar.
export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Ingresá tu nombre'),
  bio: z.string().trim().max(280, 'Máximo 280 caracteres'),
  /** 'DD/MM/AAAA' o vacío. La edad mínima todavía no está definida (ver CLAUDE.md). */
  birthDate: z
    .string()
    .trim()
    .refine((v) => v === '' || isValidPastDate(v), 'Usá el formato DD/MM/AAAA'),
  subjects: z.string().trim(),
  hourlyRate: z
    .string()
    .trim()
    .refine((v) => v === '' || (/^\d+$/.test(v) && +v > 0), 'Ingresá un número'),
  cv: z.string().trim().max(1000, 'Máximo 1000 caracteres'),
});
export type ProfileForm = z.infer<typeof profileSchema>;
