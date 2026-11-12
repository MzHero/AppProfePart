# CLAUDE.md — Particuldando

App móvil (Android + iOS) que conecta **alumnos** con **profesores particulares**, con mecánica tipo Tinder:
el alumno da like a un profesor → el profesor acepta o rechaza → si acepta se habilita el chat.
El pago de las clases se acuerda entre las partes **fuera de la app** (la app no cobra ni intermedia).

Idioma de la UI y del código de dominio: **español (rioplatense, voseo: "Ingresá", "Buscá")**.

## Estado actual

**Fase: frontend conectado a Supabase** (probado contra Supabase local; todavía sin proyecto en la nube).
Sin variables de Supabase configuradas, la app usa datos mock en memoria.

| Carpeta | Qué es |
|---|---|
| `mobile/` | **App real.** Expo SDK 58 + Expo Router + TypeScript + NativeWind. Todo el desarrollo nuevo va acá. |
| `supabase/` | **Backend.** `migrations/` (esquema, RLS, funciones RPC), `seed.sql` (datos de prueba locales), `config.toml`. |
| `database/` | `schema.sql` original (PR #1). Solo referencia: la fuente de verdad son las migraciones. |
| `client/` | Prototipo web viejo (Vite + React, `App.jsx`). **Solo referencia visual**, no se desarrolla más. |
| `Images/` | Capturas de referencia de cada pantalla. |

Pantallas de referencia → archivo que la implementa:

- `Images/log.png` → `mobile/src/app/(auth)/login.tsx`
- `Images/pantalla_por_ubi.png` → `mobile/src/app/(tabs)/nearby.tsx`
- `Images/Pantalla_swipe.png` → `mobile/src/app/(tabs)/swipe.tsx` + `src/components/TeacherSwipeCard.tsx`
- `Images/PantallaChat.png` → `mobile/src/app/(tabs)/chats.tsx`

## Comandos (siempre desde `mobile/`)

```bash
cd mobile
npx expo start            # dev server (a = Android, i = iOS, w = web)
npm run typecheck         # tsc --noEmit
npm run lint              # expo lint (ESLint 9, eslint-config-expo)
npm run format            # prettier + prettier-plugin-tailwindcss (ordena clases)
npm run theme             # regenera src/global.css desde src/theme/palette.ts
npm run db:types          # regenera services/supabase/database.types.ts (requiere Supabase local)
npx expo install <pkg>    # SIEMPRE para agregar dependencias (versiones compatibles con el SDK)
npx expo export --platform android --platform web   # verifica que el bundle compile
```

Antes de dar una tarea por terminada: `npm run typecheck && npm run lint`.

### Backend local (desde la raíz del repo, requiere Docker)

```bash
npx supabase@3.1.0 start -x studio,imgproxy,logflare,vector,supavisor,mailpit,edge-runtime
npx supabase@3.1.0 status            # URL y "Publishable key" para mobile/.env.local
npx supabase@3.1.0 db reset          # recrea la base: migraciones + seed.sql
npx supabase@3.1.0 migration new <nombre>   # nueva migración (no editar las ya aplicadas)
npx supabase@3.1.0 stop
```

Para que la app use Supabase: copiar `mobile/.env.example` a `mobile/.env.local` y completar
`EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (nunca la secret key). En un teléfono
físico, la URL es la IP de la PC en la red, no `127.0.0.1`. Después de cambiar `.env.local`, reiniciar
`npx expo start --clear`.

Usuarios demo (contraseña `123456`, existen en el mock y en `supabase/seed.sql`):
- `alumno@particuldando.com` — alumno con un chat aceptado (Martín).
- `sofia@particuldando.com` — alumna con una solicitud pendiente a Martín.
- `profe@particuldando.com` — profesor (Martín Benítez). En el seed también `lucia@` y `esteban@`.

Seeds de profesores (todos con contraseña `123456`):
- `seed.sql` + `seeds/teachers_distances.sql`: 16 profes a 30 m–12 km del Obelisco (-34.6037, -58.3816).
- `seeds/teachers_tandil.sql`: 13 profes en lugares públicos de Tandil (plaza, Campus UNICEN, Lago del
  Fuerte, terminal…). Desde la Plaza Independencia (-37.3217, -59.1332) hay 2 a menos de 200 m.
Simular alguna de esas ubicaciones para ver distancias. Los datos mock viven en memoria y se reinician al recargar la app.

## Arquitectura

```
mobile/src/
├── app/                      # Rutas (Expo Router: cada archivo es una pantalla)
│   ├── _layout.tsx           # Providers + Stack con Stack.Protected (guard por sesión)
│   ├── index.tsx             # "/" → redirige a /login, /nearby (alumno) o /requests (profesor)
│   ├── (auth)/login, register
│   ├── (tabs)/               # nearby · swipe · requests · chats · profile (tabs según rol)
│   ├── teacher/[id].tsx      # perfil completo del profesor
│   ├── chat/[matchId].tsx    # conversación (gifted-chat)
│   ├── profile/edit.tsx      # edición de perfil (modal)
│   └── legal/[doc].tsx       # terms | privacy
├── components/               # ui.tsx (Button, TextField, Chip, Stars…), tarjetas, ReportBlockSheet,
│                             # brand.tsx (splash con la "P" + logotipo animado del login),
│                             # SwipeDeck.tsx (mazo de swipe propio), MatchCelebration.tsx
│                             # (animación de match), StudentMatchWatcher.tsx, DiscoverIntroModal.tsx
├── hooks/queries.ts          # TODOS los hooks de TanStack Query (+ queryKeys)
├── hooks/useCurrentLocation.ts
├── services/                 # Capa de datos
│   ├── index.ts              # elige implementación: Supabase si hay env vars, si no mock
│   ├── types.ts              # CONTRATO (interfaces AuthService, TeacherService, MatchService…)
│   ├── supabase/             # implementación real: client, auth, teachers, matches, chat,
│   │                         # moderation, mappers (fila -> modelo), errors (mensajes en español),
│   │                         # database.types.ts (GENERADO con npm run db:types)
│   └── mock/                 # implementación en memoria (db.ts + un archivo por servicio)
├── providers/SessionProvider.tsx   # sesión (useSession / useCurrentUser)
├── providers/AppThemeProvider.tsx  # tema sistema/claro/oscuro (useAppTheme)
├── lib/                      # schemas.ts (Zod), format.ts, nativewind-interop.ts
├── theme/palette.ts          # FUENTE ÚNICA de colores (claro y oscuro)
└── types/models.ts           # modelos de dominio que consume la UI
```

### Reglas de arquitectura (decisiones tomadas, no cambiar sin consultar)

1. **Las pantallas NUNCA llaman a Supabase (ni a `services/mock`) directamente.**
   Flujo: pantalla → hook de `hooks/queries.ts` → servicio de `@/services`. Solo `services/supabase/` importa
   `@supabase/supabase-js`. Para migrar de backend se escribe otra implementación de `services/types.ts`.
   Si cambiás una firma en `types.ts`, actualizá **las dos** implementaciones (supabase y mock).
2. **La UI depende de `types/models.ts`, no de los tipos de la base.** `services/supabase/mappers.ts` convierte
   filas → modelos. Ojo: los tipos generados marcan como no nulas las columnas que devuelven las funciones RPC
   aunque puedan venir `null`; los mappers las tratan como nullable.
3. **Privacidad de ubicación:** el backend nunca devuelve coordenadas, solo `distance_km` redondeada a 50 m.
   La ubicación del profesor se guarda redondeada (~100 m) con `set_my_location` y la columna
   `teacher_profiles.location` no es legible por la app. El alumno envía sus coordenadas solo como parámetro.
4. **Flujo de match (sobre la tabla `swipes`):** alumno `like` al profesor = solicitud pendiente → el profesor
   responde con `like` (acepta: un trigger crea `matches` + `conversations`) o `pass` (rechaza). Todo pasa por
   la RPC `swipe()`. Un profesor solo puede responder a alumnos que lo likearon (lo valida `can_swipe`).
5. **Moderación obligatoria:** reportar y bloquear desde el chat y desde el perfil del profesor
   (`ReportBlockSheet`). Un bloqueo oculta al usuario en grilla, swipe y chats (en ambos sentidos).
6. **Requisitos de tiendas ya contemplados en la UI:** eliminar cuenta (Perfil), Términos y Privacidad
   (`legal/[doc]`, textos pendientes). Si se agrega login con Google → agregar también "Iniciar sesión con Apple".

### Base de datos (Supabase)

- Esquema en `supabase/migrations/` (basado en `database/schema.sql`). **Nunca editar una migración ya
  aplicada**: crear una nueva. Después de cambiar el esquema: `db reset` + `npm run db:types`.
- `public.users.id` = `auth.users.id`. Al registrarse, el trigger `on_auth_user_created` crea `users` (y
  `teacher_profiles` si el rol es teacher) con `options.data = { name, role }` del `signUp`.
- **RLS en todas las tablas** y `anon` sin acceso. Permisos **por columna**: no se puede leer `email` ni
  `birth_date` ajenos (`select('*')` sobre `users` falla: pedir columnas explícitas); el perfil propio
  completo se lee con `get_my_profile()`.
- Lecturas con lógica = funciones RPC (`security definer`, `search_path = ''`): `search_teachers` (grilla,
  swipe y perfil; filtros por distancia, texto y materia), `available_subjects` (desplegable de materias
  de "Cercanos", con cuántos profes hay en el radio), `incoming_requests`, `my_pending_requests`, `my_conversations`, `get_match`,
  `get_my_profile`. Escrituras con lógica: `swipe`, `set_my_subjects`, `set_my_location`, `delete_my_account`.
  El resto (mensajes, bloqueos, reportes, edición de perfil) va directo a las tablas con RLS.
- Bloqueos: `is_blocked_with()` oculta al otro usuario en búsqueda, solicitudes, chats y mensajes, en ambos
  sentidos. Los reportes solo se insertan; se revisan con `service_role` (futuro panel admin).
- Chat: Supabase Realtime sobre `messages` (respeta RLS). Fotos: bucket público `avatars`, cada usuario
  escribe solo en `avatars/<su uuid>/`.

### Navegación y roles

- Auth con `Stack.Protected` en `app/_layout.tsx`. Al cambiar la sesión, el router vuelve a `index.tsx`, que
  redirige según el rol. No agregar redirecciones manuales después de login/logout.
- Las tabs se ocultan por rol con `href: null` en `(tabs)/_layout.tsx`:
  alumno → Cercanos, Descubrir, Chats, Perfil · profesor → Solicitudes, Chats, Perfil.
- `useCurrentUser()` solo en pantallas protegidas (lanza si no hay sesión). En el resto, `useSession()`.

## Convenciones de UI

- **Estilos con NativeWind v4** (`className`, Tailwind v3). Nada de `StyleSheet.create` salvo casos puntuales.
- **Colores y modo oscuro:** la app sigue el tema del sistema por defecto; en Perfil → Apariencia el usuario
  elige Sistema / Claro / Oscuro (se guarda con AsyncStorage). Lo maneja `AppThemeProvider`.
  - Los colores son **tokens semánticos** que cambian solos con el tema. **No usar colores fijos**
    (`bg-white`, `text-gray-…`, hex) ni variantes `dark:`; usar los tokens:
    `bg-background` (fondo de pantalla) · `bg-surface` (tarjetas, headers) · `bg-muted` (rellenos sutiles) ·
    `bg-brand` / `text-brand` (violeta) · `bg-brand-soft` + `text-brand-fg` (tags) · `text-fg` /
    `text-fg-muted` / `text-fg-soft` (texto) · `border-line` / `border-line-brand` · `bg-accent` (botón
    primario, destructivo) / `bg-accent-soft` · `text-success` / `bg-success-soft` · `text-star`.
    Excepción: `text-white` sobre `bg-brand` / `bg-accent`.
  - **Para cambiar un color:** editar `src/theme/palette.ts` (claro y oscuro) y correr `npm run theme`, que
    regenera `src/global.css` (variables CSS `:root` / `.dark:root`). No editar `global.css` a mano.
  - Donde no se puede usar `className` (prop `color` de iconos, opciones de navegación, librerías de
    terceros) usar `const { colors } = useAppTheme()`.
- **Splash e intro del login** (`components/brand.tsx`): el splash nativo es solo color de fondo
  (`splash-icon.png` transparente). Después `<BrandSplash>` muestra la "P" latiendo (mínimo `MIN_SPLASH_MS`)
  y al terminar de cargar le pasa la posta al login: su "P" se ubica en el mismo punto de la pantalla
  (`measureInWindow`) y desde ahí se despliega "Particuldando", sube y aparecen los inputs. Con sesión
  iniciada, la P se desvanece. Respeta "reducir movimiento" del sistema. Si cambiás el tamaño o la fuente de
  la P, mantené `BRAND_TEXT` compartido entre ambas.
- **Reanimated + React Compiler:** usar `shared.get()` / `shared.set()` (no `.value`) y `scheduleOnRN` de
  `react-native-worklets` (no `runOnJS`); el lint del compilador rechaza lo otro.
- **Componentes de terceros + className:** NativeWind no estiliza componentes que no conoce. Registrarlos con
  `cssInterop` en `src/lib/nativewind-interop.ts` (ya está `KeyboardAwareScrollView`). `expo-image` se
  estiliza con `style`, no con `className`.
- **Iconos:** `lucide-react-native`, importados de a uno.
- **Imágenes:** `expo-image`.
- **Formularios:** React Hook Form + Zod (`lib/schemas.ts`) con `Controller` + `TextField`. Mensajes de error
  en español. Los inputs numéricos se validan como string y se convierten al guardar.
- **Datos del servidor:** siempre TanStack Query. Las mutaciones invalidan las `queryKeys` afectadas.
- **Formato:** Prettier (`singleQuote`, `printWidth: 100`, `bracketSameLine`). Correr `npm run format`.
- **Alias de imports:** `@/` → `mobile/src/`.
- Distancias se muestran con `formatDistance(km)` ("50 m" / "1,2 km" / "335 km"). Los filtros de la grilla están en
  `DISTANCE_FILTERS_KM` (`lib/format.ts`).

## Gotchas

- **Expo cambia mucho entre SDKs:** antes de usar una API de Expo / Expo Router, verificar la doc de SDK 58
  (ver `mobile/AGENTS.md`). No confiar en la memoria.
- `@react-navigation/*` **no** está instalado aparte: usar los re-exports de `expo-router`
  (p. ej. `useHeaderHeight` desde `expo-router/react-navigation`).
- **Swipe:** `components/SwipeDeck.tsx` es propio (Reanimated + Gesture Handler v3 con `usePanGesture`).
  No usar `react-native-deck-swiper`: usa `InteractionManager`, eliminado en React Native 0.88, y crashea
  al desmontarse (por ejemplo al cerrar sesión). Gesture Handler v3: la API nueva son hooks
  (`usePanGesture`, `GestureDetector`); `Gesture.Pan()` quedó como legacy.
- Dentro de una tarjeta arrastrable, las imágenes van con `pointerEvents="none"`: en web, apretar sobre un
  `<img>` inicia el "arrastrar imagen" del navegador y cancela el gesto.
- Un hijo con `position: absolute` (`StyleSheet.absoluteFill`) ignora el padding del padre: envolverlo en
  una `View` interna.
- `react-native-gifted-chat` está en **modo mantenimiento** (el desarrollo pasó a
  `@kesha-antonov/react-native-chat`). Todo el acoplamiento está en `app/chat/[matchId].tsx` para poder
  cambiarlo. Se usa con `disableKeyboardProvider` porque hay un `KeyboardProvider` en la raíz.
- `tailwind.config.js` debe tener `darkMode: 'class'`. Con el valor por defecto (`media`), NativeWind en web
  (modo dev) tira "Cannot manually set color scheme, as dark mode is type 'media'". Tras cambiar la config
  de Tailwind o `global.css`, reiniciar con `npx expo start --clear`.
- `app.json` debe tener `userInterfaceStyle: "automatic"`; con `"light"` el sistema siempre reporta claro.
- En nativo, el tema se aplica con `Appearance.setColorScheme` (vía NativeWind); en web NativeWind no
  resuelve "sistema" con `darkMode: 'class'`, por eso `AppThemeProvider` lo resuelve a mano en web.
- NativeWind no garantiza `className` en componentes de Reanimated (`Animated.View/Text`): envolver en un
  `View` con `className` o usar `style` con `useAppTheme().colors`.
- Views que se miden con `measureInWindow` necesitan `collapsable={false}` (Android las aplana si no).
- El export estático (`expo export`) no reproduce todos los errores del dev server en web: verificar también
  con `npx expo start --web`.
- El repo está en un disco montado (`/media/...`): Metro a veces **no detecta cambios** y sirve una versión
  vieja. Si un cambio no aparece, reiniciar con `npx expo start --clear`.
- **Realtime:** el estado `SUBSCRIBED` llega antes de que la suscripción a Postgres esté activa; lo que se
  envíe en ese intervalo se pierde. `chatService.subscribe` avisa con `onReady` (evento `system` "Subscribed to
  PostgreSQL") y `useMessages` recarga en ese momento. No quitar esa recarga.
- Tras `supabase db reset` Realtime tarda unos segundos en volver a estar listo.
- Agregar un parámetro a una función SQL cambia su firma: en la migración hacer `drop function` + `create`
  (con `create or replace` quedan dos versiones y PostgREST no sabe cuál llamar) y volver a dar los `grant`.
- Migración nueva sobre la base local sin borrar datos: `npx supabase@3.1.0 migration up`.
- gifted-chat en web: Enter agrega un salto de línea, no envía (se usa el botón "Enviar", como en el teléfono).
- Supabase en la nube pide **confirmar el email** al registrarse por defecto (en local está desactivado):
  `signUp` devuelve `needsEmailConfirmation` y la pantalla de registro lo avisa.
- No llamar a Supabase dentro del callback de `onAuthStateChange` (se puede trabar): diferir con `setTimeout`.
- **Rendimiento:** el backend responde en 5-15 ms por consulta; la demora en el teléfono viene del cliente.
  `useCurrentLocation` usa primero la última posición conocida (instantánea) y después la del GPS; el perfil
  del profesor usa los datos ya cargados de la grilla/mazo (`placeholderData`); "Cercanos" precarga el mazo
  y "Descubrir" precarga las fotos. Expo Go en modo desarrollo es mucho más lento que la app final: para
  medir velocidad real, `npx expo start --no-dev --minify`.
- **Políticas RLS:** no llamar funciones por fila. Usar `columna in (select public.f())`, que Postgres
  evalúa una sola vez por consulta (ver `my_conversation_ids()` en las políticas de `messages`).
- Matches nuevos: Realtime sobre `matches` (`matchService.onNewMatch`) dispara la animación del alumno. Los
  matches ya festejados se guardan en el dispositivo (`lib/storage.ts`); el aviso de "Descubrir" también.
- `Alert.alert` con botones no funciona en web (react-native-web lo ignora). La app apunta a Android/iOS;
  web es solo para previsualizar.
- Librerías con código nativo fuera de Expo Go → necesitan development build (`npx expo run:android` o
  `eas build --profile development`).
- `ios/` y `android/` se generan (CNG): no crearlos ni editarlos a mano; configurar en `app.json`.

## Stack y roadmap

**En uso ahora:** Expo Router · NativeWind · TanStack Query · React Hook Form + Zod · gifted-chat ·
expo-location · expo-image-picker · lucide-react-native ·
Supabase (`@supabase/supabase-js`, sesión en AsyncStorage; Auth, Postgres + PostGIS, Realtime, Storage).

**Próximas fases (no instalar hasta que haga falta):**
- Backend en la nube: crear el proyecto de Supabase (región São Paulo), `npx supabase@3.1.0 link` y
  `db push` para aplicar las migraciones. Backups con `pg_dump` programado. Configurar SMTP propio para
  los emails de confirmación.
- Reseñas: la tabla `reviews` y su RLS ya existen (solo reseña quien tuvo match); falta la UI.
- Push: Expo Notifications.
- Según necesidad: Zustand (si crece el estado global: sesión + ubicación), Sentry, PostHog, Gluestack UI.
- Deploy: EAS Build + EAS Submit, EAS Update para fixes OTA.
- Fase 2 opcional: panel admin en Next.js (Vercel) para moderar reportes.

**Criterios para sumar librerías:** activamente mantenidas, compatibles con el SDK de Expo del proyecto
(`npx expo install`), y solo cuando hacen falta: cada dependencia es mantenimiento futuro.

**Descartados:** Stream Chat / Sendbird (costo y lock-in), Firebase (no relacional, sin PostGIS), Appwrite,
Flutter.

## Pendientes de definir (preguntar antes de asumir)

- Edad mínima / manejo de menores de edad.
- Quién revisa los reportes y en qué plazo.
- Logo y branding definitivos (el nombre ya está decidido: **Particuldando**).
- Monetización futura.
- Radios de distancia definitivos (hoy 50/100/200/500 m, tomados del prototipo).
- Textos legales definitivos.

@mobile/AGENTS.md
