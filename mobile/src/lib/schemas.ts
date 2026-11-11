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

// Los inputs de texto entregan strings; los campos numéricos se validan como texto
// y se convierten al guardar.
export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Ingresá tu nombre'),
  bio: z.string().trim().max(280, 'Máximo 280 caracteres'),
  age: z
    .string()
    .trim()
    .refine((v) => v === '' || (/^\d+$/.test(v) && +v >= 16 && +v <= 99), 'Edad inválida'),
  subjects: z.string().trim(),
  hourlyRate: z
    .string()
    .trim()
    .refine((v) => v === '' || (/^\d+$/.test(v) && +v > 0), 'Ingresá un número'),
  cv: z.string().trim().max(1000, 'Máximo 1000 caracteres'),
});
export type ProfileForm = z.infer<typeof profileSchema>;
