// Base de datos en memoria para desarrollar el frontend sin backend.
// Se reinicia al recargar la app. Solo los archivos de src/services/ pueden importar esto.

import type { Match, Message, TeacherProfile, User } from '@/types/models';

export const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

export const uid = () => Math.random().toString(36).slice(2, 10);

interface MockUser extends User {
  password: string;
}

interface MockTeacher extends Omit<TeacherProfile, 'distanceKm'> {
  /** Simula la distancia que calcularía PostGIS en el servidor. */
  distanceKm: number;
}

const teachers: MockTeacher[] = [
  {
    id: 't1',
    name: 'Martín Benítez',
    age: 28,
    subjects: ['Física I', 'Química', 'Matemática'],
    hourlyRate: 15,
    rating: 4,
    bio: 'Clases prácticas con resolución paso a paso de ejercicios.',
    cv: 'Licenciado en Ciencias Físicas (UBA). 5 años dictando clases particulares y preparación para exámenes de ingreso.',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600',
    distanceKm: 0.05,
  },
  {
    id: 't2',
    name: 'Lucía Fernández',
    age: 32,
    subjects: ['Cálculo', 'Álgebra Lineal'],
    hourlyRate: 20,
    rating: 5,
    bio: 'Hago que las matemáticas difíciles se entiendan en la primera clase.',
    cv: 'Ingeniera Electrónica con posgrado en docencia universitaria.',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600',
    distanceKm: 0.1,
  },
  {
    id: 't3',
    name: 'Esteban Rojas',
    age: 25,
    subjects: ['Inglés C1', 'First Certificate'],
    hourlyRate: 18,
    rating: 3,
    bio: 'Enfoque 100% conversacional e intensivo para entrevistas y exámenes.',
    cv: 'Profesor de lengua inglesa certificado por Cambridge.',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600',
    distanceKm: 0.2,
  },
];

const users: MockUser[] = [
  {
    id: 's1',
    role: 'student',
    name: 'Milton',
    email: 'alumno@particulando.com',
    password: '123456',
  },
  {
    id: 's2',
    role: 'student',
    name: 'Sofía Paz',
    email: 'sofia@particulando.com',
    password: '123456',
  },
  {
    id: 't1',
    role: 'teacher',
    name: 'Martín Benítez',
    email: 'profe@particulando.com',
    password: '123456',
    avatarUrl: teachers[0].avatarUrl,
    age: teachers[0].age,
    bio: teachers[0].bio,
    subjects: teachers[0].subjects,
    hourlyRate: teachers[0].hourlyRate,
    cv: teachers[0].cv,
  },
];

const publicUser = (id: string) => {
  const u = users.find((x) => x.id === id) ?? teachers.find((x) => x.id === id);
  if (!u) throw new Error(`Usuario ${id} no existe`);
  return {
    id: u.id,
    name: u.name,
    avatarUrl: u.avatarUrl,
    role: 'role' in u ? u.role : ('teacher' as const),
  };
};

const now = Date.now();

const matches: Match[] = [
  {
    id: 'm1',
    status: 'accepted',
    createdAt: new Date(now - 86_400_000).toISOString(),
    student: publicUser('s1'),
    teacher: publicUser('t1'),
  },
  {
    id: 'm2',
    status: 'pending',
    createdAt: new Date(now - 3_600_000).toISOString(),
    student: publicUser('s2'),
    teacher: publicUser('t1'),
  },
];

const messages: Message[] = [
  {
    id: 'msg1',
    matchId: 'm1',
    senderId: 't1',
    text: 'Hola! ¿Cuándo te viene bien la clase?',
    createdAt: new Date(now - 600_000).toISOString(),
  },
];

/** Pares [quien bloquea, bloqueado] */
const blocks: [string, string][] = [];
/** Profesores descartados por cada alumno en el swipe */
const passes: [string, string][] = [];

export const db = { users, teachers, matches, messages, blocks, passes, publicUser };
