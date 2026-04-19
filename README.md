# Peumayen

**Sistema operativo doméstico** para una familia de 7 personas + la perra Roma en Alcorcón (Madrid). PWA construida con Next.js 15, Supabase y Tailwind CSS v4.

Esta es la **fase 1** del proyecto: validar adopción. Sin API de Claude, sin Telegram, sin n8n, sin coste operativo más allá del tier gratis de Supabase y Vercel. La familia entra con usuario+contraseña, ve un hogar compartido y puede chatear. Todo lo demás (IA, automatizaciones, integraciones) se añade cuando el uso lo justifique.

Ver [PROJECT_SPEC.md](./PROJECT_SPEC.md) para la visión completa del producto y el roadmap.

---

## Stack

| Capa | Tecnología |
| --- | --- |
| Framework | Next.js 15 (App Router) + React 19 + TypeScript strict |
| Estilos | Tailwind CSS v4 + shadcn/ui (estilo new-york, base neutral) |
| Backend | Supabase (Postgres + Auth + Realtime + RLS) |
| PWA | Serwist 9 (`@serwist/next`) |
| Auth | Username + password (email sintético `<user>@peumayen.local`) |
| Hosting | Vercel |

---

## Requisitos

- **Node.js 20+** (recomendado 22 LTS)
- **npm 10+**
- Cuenta de **Supabase** (proyecto en cloud)
- Cuenta de **Vercel** (para desplegar)
- Opcional: **Supabase CLI** local (`npm i -g supabase`) si quieres aplicar migraciones desde terminal

---

## Puesta en marcha en local

### 1. Clonar e instalar

```bash
git clone git@github.com:<tu-usuario>/peumayen.git
cd peumayen
npm install
```

### 2. Configurar variables de entorno

Copiar el ejemplo y rellenar con tus credenciales de Supabase:

```bash
cp .env.local.example .env.local
```

Editar `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>
SUPABASE_PROJECT_REF=<ref-del-proyecto>      # opcional, para scripts CLI
```

Ambas variables (`URL` y `ANON_KEY`) las encuentras en **Supabase Dashboard → Project Settings → API**.

### 3. Aplicar el esquema de base de datos

El esquema completo vive en [supabase/migrations/0001_init.sql](./supabase/migrations/0001_init.sql). Dos opciones:

**Opción A — desde el SQL Editor de Supabase (más sencillo):**

1. Abre el dashboard de tu proyecto → **SQL Editor → New query**.
2. Pega el contenido íntegro de `supabase/migrations/0001_init.sql`.
3. Ejecuta. Creará el schema `peumayen`, extensiones, tablas, RLS policies, funciones y publicaciones de realtime.
4. **Paso imprescindible:** expón el schema a PostgREST en **Settings → API → Exposed schemas**. Añade `peumayen` a la lista (junto con los que ya haya, p.ej. `public`). Sin esto el cliente devuelve 404 en todas las tablas.

**Opción B — con Supabase CLI:**

```bash
supabase login
supabase link --project-ref <SUPABASE_PROJECT_REF>
npm run db:push
```

### 4. Regenerar tipos de TypeScript

Tras aplicar la migración, regenera los tipos reales del schema `peumayen`:

```bash
npm run db:types:remote -- --schema peumayen
```

Esto sobrescribe [types/database.ts](./types/database.ts) con el esquema real y resuelve el TODO de casting en `create_household`.

### 5. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). El service worker **no** se registra en dev (solo en `production`), así que no verás comportamiento offline aquí.

### 6. Probar el flujo end-to-end

1. Crear los 7 usuarios en **Supabase Dashboard → Authentication → Users → Add user**. Cada email debe seguir el formato `<username>@peumayen.local` (ej. `papa@peumayen.local`). Marcar _auto-confirm_.
2. Entrar con el primer usuario admin en `/login`.
3. En `/onboarding` crear el hogar (se ejecuta la RPC `create_household` y el usuario queda como `admin`).
4. Volver al dashboard y, desde el SQL editor, insertar al resto de miembros en `household_members` asociados al `household_id` creado y con su `user_id` correspondiente. Un ejemplo de bloque seed comentado está al final de la migración.
5. Cada miembro entra con su usuario y queda autenticado.

---

## Scripts disponibles

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor Next.js en desarrollo con Turbopack |
| `npm run build` | Build de producción + compilación del service worker |
| `npm start` | Servir el build de producción |
| `npm run lint` | ESLint 9 (flat config) |
| `npm run format` | Prettier sobre todo el repo |
| `npm run format:check` | Verificar formato sin escribir |
| `npm run db:types` | Generar tipos desde Supabase local |
| `npm run db:types:remote` | Generar tipos desde el proyecto en cloud |
| `npm run db:push` | Aplicar migraciones al proyecto enlazado |
| `npm run db:reset` | Resetear base de datos local |
| `npm run pwa:icons` | Regenerar los iconos PNG placeholder |

---

## Estructura del proyecto

```
.
├── app/                        # App Router (rutas, layouts, sw.ts)
│   ├── layout.tsx              # Root layout + metadata PWA
│   ├── page.tsx                # Dashboard (requiere sesión + hogar)
│   ├── login/                  # Formulario de login (user+password)
│   ├── onboarding/             # Creación del primer hogar
│   ├── offline/                # Fallback cuando no hay red
│   └── sw.ts                   # Source del service worker (Serwist)
├── components/
│   ├── auth/                   # LoginForm, SignOutButton
│   ├── onboarding/             # CreateHouseholdForm
│   └── pwa/                    # ServiceWorkerRegistration
├── lib/
│   ├── auth.ts                 # Server: requireUser, requireMembership
│   ├── auth-client.ts          # usernameToEmail (sintético)
│   └── supabase/
│       ├── client.ts           # Browser client
│       ├── server.ts           # Server client (cookies async)
│       └── middleware.ts       # updateSession, redirecciones
├── middleware.ts               # Middleware raíz (refresca sesión)
├── supabase/
│   └── migrations/
│       └── 0001_init.sql       # Esquema + RLS + funciones + realtime
├── types/
│   └── database.ts             # Tipos generados (placeholder hasta `db:types:remote`)
├── public/
│   ├── manifest.json           # Web app manifest
│   ├── icons/                  # Iconos PWA
│   └── sw.js                   # Generado por Serwist en `build` (ignorado)
├── scripts/
│   ├── make-placeholder-icons.mjs  # Generador PNG sin dependencias
│   └── generate-pwa-assets.sh      # Iconos reales con pwa-asset-generator
├── next.config.ts              # withSerwistInit
├── PROJECT_SPEC.md             # Visión del producto
└── README.md                   # Este archivo
```

---

## Modelo de datos (resumen)

Toda la información vive en Supabase con **Row Level Security** activa. Tres _scopes_ de visibilidad:

- **`family`** — visible para todos los miembros del hogar (chat, items compartidos, calendario).
- **`couple`** — visible solo para los dos admin.
- **`personal`** — visible solo para el propietario.

Tablas principales:

| Tabla | Propósito |
| --- | --- |
| `households` | El hogar. Normalmente 1 fila. |
| `household_members` | Los 7 miembros. `role` (admin/member), `member_type` (adult/teen/child), `user_id` FK a `auth.users`. |
| `projects` | Agrupaciones opcionales de items. |
| `items` | Tabla polimórfica con `type` (task, note, event, etc.) + `data jsonb`. |
| `messages` | Chat de familia. Tabla dedicada (no dentro de `items`) por patrones de query. |
| `presence` | Quién está en casa cada día. Unique `(member_id, date)`. |
| `embeddings` | Reservado para futura capa semántica (pgvector instalado). |

La función `create_household(hh_name, admin_display_name)` es `SECURITY DEFINER` y resuelve el problema huevo-y-gallina de RLS al crear el primer hogar.

---

## PWA: verificación en dispositivos

El service worker solo se registra en **producción**. Para probar en real:

```bash
npm run build
npm start
```

Luego, desde el móvil, visita la URL del ordenador (mismo Wi-Fi + [http://<ip-local>:3000](http://<ip-local>:3000)) o despliega a Vercel.

### iOS (Safari)

1. Abrir la URL en **Safari** (no en Chrome).
2. Botón _Compartir_ → **Añadir a pantalla de inicio**.
3. Lanzarla desde el icono instalado. Debe abrir en modo _standalone_ (sin barra de navegador).
4. Con modo avión activado, recargar: debe ver la página `/offline` con los shell cacheados.

### Android (Chrome / Edge)

1. Abrir la URL.
2. Chrome mostrará el prompt **Añadir a pantalla de inicio** o se accede desde el menú ⋮ → _Instalar app_.
3. Verificar _standalone_ + fallback offline igual que en iOS.

### Iconos

Los iconos actuales son _placeholders_ generados por Node puro ([scripts/make-placeholder-icons.mjs](./scripts/make-placeholder-icons.mjs)). Para generar iconos reales a partir de un logo, usa:

```bash
./scripts/generate-pwa-assets.sh path/to/logo.svg
```

Requiere Node y `npx` (descarga `pwa-asset-generator` bajo demanda).

---

## Despliegue en Vercel

1. Conectar el repositorio de GitHub en [vercel.com/new](https://vercel.com/new).
2. **Framework preset**: Next.js (se detecta solo).
3. **Environment Variables** — añadir en Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy. El primer build generará `public/sw.js` automáticamente.
5. **Supabase → Authentication → URL Configuration**:
   - `Site URL`: `https://<tu-dominio>.vercel.app`
   - _Redirect URLs_ no hacen falta (no usamos OAuth ni magic links).

---

## Autenticación: username + password

Supabase Auth exige email. Como varios miembros de la familia no tienen, usamos un email sintético:

```
<username>@peumayen.local
```

El formulario de login pide solo usuario + contraseña y construye el email internamente ([lib/auth-client.ts](./lib/auth-client.ts)). La creación de usuarios se hace desde el dashboard de Supabase con _auto-confirm_ activado (no se envía correo de verificación: el dominio `.local` no existe).

Los 2 admins (yo y mi mujer) pueden resetear contraseñas y gestionar miembros desde el dashboard de Supabase.

---

## Roadmap inmediato

- [x] Scaffolding Next.js + Tailwind + shadcn/ui
- [x] Supabase SSR + esquema completo + RLS
- [x] Auth username+password
- [x] Onboarding: crear hogar
- [x] PWA con Serwist + icons placeholder
- [ ] **Chat de familia** (siguiente tarea — tabla `messages` ya existe, falta UI)
- [ ] Presence diaria (quién está en casa)
- [ ] Items básicos: tareas, notas, eventos
- [ ] Iconos reales de la app
- [ ] Validar uso real durante 2-4 semanas antes de añadir IA/automatizaciones

---

## Licencia

Privado. Uso familiar.
