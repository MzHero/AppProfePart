# CLAUDE.md — Particuldando

App móvil (Android + iOS) que conecta **alumnos** con **profesores particulares**, con mecánica tipo Tinder:
el alumno da like a un profesor → el profesor acepta o rechaza → si acepta se habilita el chat.
El pago de las clases se acuerda entre las partes **fuera de la app** (la app no cobra ni intermedia).

Idioma de la UI y del código de dominio: **español (rioplatense, voseo: "Ingresá", "Buscá")**.

## Estado actual

**Fase: solo frontend, con datos mock.** No hay backend todavía (Supabase viene después).

| Carpeta | Qué es |
|---|---|
| `mobile/` | **App real.** Expo SDK 58 + Expo Router + TypeScript + NativeWind. Todo el desarrollo nuevo va acá. |
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
npx expo install <pkg>    # SIEMPRE para agregar dependencias (versiones compatibles con el SDK)
npx expo export --platform android --platform web   # verifica que el bundle compile
```

Antes de dar una tarea por terminada: `npm run typecheck && npm run lint`.

Usuarios demo (mock, contraseña `123456`):
- `alumno@particuldando.com` — alumno con un chat aceptado (Martín).
- `profe@particuldando.com` — profesor (Martín Benítez) con una solicitud pendiente (Sofía).

Los datos mock viven en memoria: se reinician al recargar la app.

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
│                             # brand.tsx (splash con la "P" + logotipo animado del login)
├── hooks/queries.ts          # TODOS los hooks de TanStack Query (+ queryKeys)
├── hooks/useCurrentLocation.ts
├── services/                 # Capa de datos: authService, teacherService, matchService,
│   │                         # chatService, moderationService
│   └── mock/db.ts            # BD en memoria (solo importable desde services/)
├── providers/SessionProvider.tsx   # sesión (useSession / useCurrentUser)
├── providers/AppThemeProvider.tsx  # tema sistema/claro/oscuro (useAppTheme)
├── lib/                      # schemas.ts (Zod), format.ts, nativewind-interop.ts
├── theme/palette.ts          # FUENTE ÚNICA de colores (claro y oscuro)
└── types/models.ts           # modelos de dominio que consume la UI
```

### Reglas de arquitectura (decisiones tomadas, no cambiar sin consultar)

1. **Las pantallas NUNCA llaman a Supabase (ni a `services/mock`) directamente.**
   Flujo: pantalla → hook de `hooks/queries.ts` → servicio de `services/`. Esto permite migrar de backend
   cambiando solo `services/`. Al conectar Supabase, se reemplaza la implementación interna de cada servicio
   manteniendo sus firmas.
2. **La UI depende de `types/models.ts`, no de los tipos de la base.** Cuando exista Supabase, los tipos se
   generan con `supabase gen types typescript` y los servicios mapean fila → modelo.
3. **Privacidad de ubicación:** el backend nunca devuelve coordenadas de otros usuarios, solo `distanceKm`.
   El cliente envía sus propias coordenadas solo para calcular distancias (PostGIS en el servidor).
4. **Flujo de match:** like del alumno → `pending` → el profesor `accepted` / `rejected`. El chat solo existe
   para matches `accepted`. Un alumno no puede escribirle a un profesor antes de que acepte.
5. **Moderación obligatoria:** reportar y bloquear desde el chat y desde el perfil del profesor
   (`ReportBlockSheet`). Un bloqueo oculta al usuario en grilla, swipe y chats (en ambos sentidos).
6. **Requisitos de tiendas ya contemplados en la UI:** eliminar cuenta (Perfil), Términos y Privacidad
   (`legal/[doc]`, textos pendientes). Si se agrega login con Google → agregar también "Iniciar sesión con Apple".

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
- Distancias se muestran con `formatDistance(km)` ("50 m" / "1.2 km"). Los filtros de la grilla están en
  `DISTANCE_FILTERS_KM` (`lib/format.ts`).

## Gotchas

- **Expo cambia mucho entre SDKs:** antes de usar una API de Expo / Expo Router, verificar la doc de SDK 58
  (ver `mobile/AGENTS.md`). No confiar en la memoria.
- `@react-navigation/*` **no** está instalado aparte: usar los re-exports de `expo-router`
  (p. ej. `useHeaderHeight` desde `expo-router/react-navigation`).
- `react-native-deck-swiper` calcula el alto de la tarjeta con la altura de la **ventana**; por eso
  `swipe.tsx` mide el contenedor con `onLayout` y ajusta `marginBottom`.
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
- `Alert.alert` con botones no funciona en web (react-native-web lo ignora). La app apunta a Android/iOS;
  web es solo para previsualizar.
- Librerías con código nativo fuera de Expo Go → necesitan development build (`npx expo run:android` o
  `eas build --profile development`).
- `ios/` y `android/` se generan (CNG): no crearlos ni editarlos a mano; configurar en `app.json`.

## Stack y roadmap

**En uso ahora:** Expo Router · NativeWind · TanStack Query · React Hook Form + Zod · gifted-chat ·
react-native-deck-swiper · expo-location · expo-image-picker · lucide-react-native.

**Próximas fases (no instalar hasta que haga falta):**
- Backend: Supabase (Auth, Postgres + PostGIS, Realtime para chat, Storage para fotos), región São Paulo.
  Esquema versionado con Supabase CLI (migraciones SQL en el repo). Backups con `pg_dump` programado.
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
