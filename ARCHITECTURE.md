# Arquitectura — Peumayen Fase 1

Decisiones transversales que deben quedar cerradas **antes** de construir los sprints de UI. Si algo aquí cambia más tarde, hay rework. Si tú revisas esto y lo apruebas, cada sprint es solo rellenar contenido sobre una estructura estable.

---

## 1. Rutas y layouts

```
app/
├── layout.tsx                  # Root: fonts, metadata, SW registration
├── globals.css
├── sw.ts
├── (auth)/                     # Grupo sin chrome (login, onboarding)
│   ├── login/page.tsx
│   └── onboarding/page.tsx
├── (app)/                      # Grupo con chrome (autenticado + con hogar)
│   ├── layout.tsx              # Header + BottomNav + requireMembership
│   ├── page.tsx                # Home / dashboard
│   ├── chat/page.tsx
│   ├── calendar/page.tsx
│   ├── tasks/page.tsx
│   └── me/page.tsx
└── offline/page.tsx            # Fallback PWA (fuera de grupos)
```

**Por qué grupos `(auth)` y `(app)`:**
- `(app)/layout.tsx` ejecuta `requireMembership()` una sola vez y monta header+nav comunes. Cada página hija hereda eso.
- `(auth)/` no mete chrome ni exige sesión: login y onboarding viven aquí.
- Cambiar de grupo = cambiar de layout sin cambiar URL.

**URLs en inglés, UI en español.** Las URLs son semi-técnicas y quiero evitar caracteres especiales. El label visible del nav es `"Chat" / "Calendario" / "Tareas" / "Yo"`.

---

## 2. Navegación

**Bottom tab nav** (mobile-first, 5 pestañas):

| Ruta | Icono (lucide) | Label |
| --- | --- | --- |
| `/`          | `Home`           | Inicio     |
| `/chat`      | `MessageCircle`  | Chat       |
| `/calendar`  | `Calendar`       | Calendario |
| `/tasks`     | `CheckSquare`    | Tareas     |
| `/me`        | `User`           | Yo         |

- Sticky al bottom, altura 64px + `pb-[env(safe-area-inset-bottom)]` para iOS standalone.
- El activo se detecta con `usePathname()`; color primario para el activo, muted para el resto.
- Componente: [components/nav/bottom-nav.tsx](components/nav/bottom-nav.tsx).

**Header** (sticky top):
- Nombre del hogar a la izquierda.
- Avatar del usuario a la derecha → dropdown con "Ajustes" + "Cerrar sesión".
- Altura 56px + `pt-[env(safe-area-inset-top)]`.
- Componente: [components/nav/top-header.tsx](components/nav/top-header.tsx).

---

## 3. Acceso a datos

**Regla base:**
- **Server Components** (páginas) fetch inicial con [lib/supabase/server.ts](lib/supabase/server.ts).
- **Client Components** mutaciones y realtime con [lib/supabase/client.ts](lib/supabase/client.ts).
- **Hidratación:** SSR pinta datos iniciales; el cliente sustituye/extiende vía realtime.

**Hooks compartidos** (client-side, en `lib/hooks/`):

| Hook | Qué devuelve | Uso |
| --- | --- | --- |
| `useHousehold()`       | `{ id, name }` del hogar actual                            | Header, páginas |
| `useCurrentMember()`   | `{ id, display_name, role, member_type, avatar_url }`      | Filtros por scope, mutaciones |
| `useMembers()`         | lista de todos los miembros del hogar                      | Selects, chat, presence |
| `useRealtimeMessages(hhId)` | suscripción + estado local del chat                   | Página de chat |
| `useRealtimeItems(hhId, filter)` | suscripción + estado filtrado de items           | Tareas, calendario |
| `useRealtimePresence(hhId, date)` | presencia del hogar en una fecha                 | Home widget |

**Inyección inicial:** `(app)/layout.tsx` carga household + members server-side y los expone a los client components vía Context (`HouseholdProvider`). Así los hooks no duplican queries.

---

## 4. Sistema de scopes

Tres scopes en el modelo: `family`, `couple`, `personal`. Un componente reutilizable:

**`<ScopePicker value onChange />`** — [components/scope/scope-picker.tsx](components/scope/scope-picker.tsx)
- Render: tres botones segmentados (Familia / Pareja / Personal).
- "Pareja" solo aparece si `useCurrentMember().role === 'admin'` (solo los 2 admin lo ven tiene sentido).
- Colores fijos:
  - `family` → primary (cyan/slate del tema)
  - `couple` → rose-500
  - `personal` → neutral-500

**`<ScopeBadge scope />`** — Badge pequeño para listar items/projects con su scope. Mismos colores.

**Filtros por scope** se aplican client-side con `useMemo`, no con queries separadas (RLS ya filtra lo que no puede ver).

---

## 5. Realtime

**Canales Supabase** — uno por tabla, filtrado por `household_id`:

```ts
const channel = supabase
  .channel(`messages:${householdId}`)
  .on("postgres_changes",
    { event: "*", schema: "peumayen", table: "messages",
      filter: `household_id=eq.${householdId}` },
    (payload) => { /* merge en estado local */ })
  .subscribe();

return () => supabase.removeChannel(channel);
```

**Lifecycle** — cada hook `useRealtime*` monta el canal en `useEffect` y lo desmonta al salir de la página. Nunca canales globales.

**Cache strategy** — `optimistic insert` al enviar, sustituido por el payload real cuando llega. Para mensajes enviados por el propio usuario, comparamos por `client_id` temporal.

---

## 6. Componentes de shadcn/ui a instalar

Todos de una sola vez al inicio de Sprint A:

```
npx shadcn@latest add button input textarea label card avatar dialog sheet
npx shadcn@latest add dropdown-menu select scroll-area sonner calendar
npx shadcn@latest add tooltip skeleton badge separator tabs popover
```

Instalaciones extra por sprint (solo si salen necesidades):
- Sprint B (chat): nada más (scroll-area ya está).
- Sprint C (calendario): `calendar` ya está. Añadir `date-fns` como dep para aritmética.
- Sprint D (tareas): quizás `checkbox`, `command`.
- Sprint E (perfil): nada más probablemente.

---

## 7. Estado y formularios

- **Sin lib global** (no Redux/Zustand/Jotai). Context para household + members, `useState` local para el resto.
- **Sin React Query.** Realtime + Server Actions cubren fetch/mutate. Si un día crece, reevaluamos.
- **Formularios** — `useState` + validación inline. No `react-hook-form` en Fase 1; los formularios son pequeños (2-4 campos) y no justifica la dependencia.
- **Mutaciones** — preferiblemente **Server Actions** (`"use server"`) cuando la pantalla es server component. En pantallas fuertemente interactivas (chat), llamadas directas al cliente con `supabase.from(...).insert(...)`.

---

## 8. Estilo y branding

**Ya configurado:**
- Tailwind v4 con `@theme` en [globals.css](app/globals.css).
- shadcn neutral como base, variables `oklch`.
- Geist Sans + Geist Mono.

**Convenciones adicionales:**
- **Color por miembro:** hash del `display_name` → uno de 8 colores predefinidos (para avatares sin foto). Función en [lib/colors.ts](lib/colors.ts).
- **Color por scope:** los tres fijos mencionados arriba.
- **Safe-area:** todas las pantallas de `(app)/` respetan `env(safe-area-inset-*)`. Definido una vez en el layout del grupo.
- **Dark mode:** no en Fase 1. El CSS ya soporta las variables pero no añadimos toggle hasta que la familia lo pida.

---

## 9. Fechas y zona horaria

- **Timezone fijo:** `Europe/Madrid`. Todos los cálculos y renderizados asumen esto.
- **Formato:** `Intl.DateTimeFormat("es-ES", { ... })` — nativo, sin dependencia.
- **Aritmética:** `date-fns` (tree-shakeable). Se añade en Sprint C cuando haga falta.
- **Persistencia:** `timestamptz` en DB (ya está). Siempre enviar y recibir ISO 8601.

---

## 10. Errores y loading states

- Cada ruta tiene `loading.tsx` con skeletons del shell.
- Cada ruta tiene `error.tsx` que pinta un card con mensaje + botón reintentar.
- **Empty states diseñados** (no "no hay datos"): copys humanos por pantalla.
  - Chat vacío: "Sé el primero en romper el silencio."
  - Sin tareas: "Nadie tiene pendientes. Milagro."
  - Sin eventos: "Nada en la agenda hoy. Disfrútalo."

---

## 11. Navegación entre grupos

- `(app)/layout.tsx` redirige a `/login` si no hay user.
- `(app)/layout.tsx` redirige a `/onboarding` si user sin household.
- `(auth)/login` redirige a `/` si ya hay user con household.
- `(auth)/onboarding` redirige a `/` si ya tiene household.
- `/offline` no redirige nunca.

Todo esto vive en helpers de [lib/auth.ts](lib/auth.ts).

---

## 12. Orden de construcción

| Sprint | Entrega | Dependencias |
| --- | --- | --- |
| **A — Shell** | grupos de ruta, layouts, header, bottom nav, páginas placeholder, shadcn components instalados, HouseholdProvider | Arranca ya |
| **B — Chat** | página `/chat` funcional con realtime, input, lista, avatares | Requiere A |
| **C — Calendario + Presence** | página `/calendar` con vista mensual, CRUD de eventos + widget de presencia en Home | Requiere A, B opcional |
| **D — Tareas + Notas** | página `/tasks` con lista + crear/completar/eliminar, ScopePicker | Requiere A |
| **E — Perfil + Gestión** | página `/me` con cambio de password, gestión de miembros (admin), iconos reales, QA | Requiere A-D |

Al final de cada sprint: commit + build verde + checkpoint escrito para revisar antes del siguiente.

---

## 13. Lo que NO entra en Fase 1

Dejo constancia para evitar scope creep durante los sprints:
- IA, resúmenes, sugerencias — Fase 3.
- Telegram, WhatsApp, integraciones externas — Fase 3+.
- Automatizaciones (n8n, cron) — Fase 3+.
- Dark mode toggle — cuando lo pidan.
- Notificaciones push — cuando adopción esté validada.
- OCR tickets, documentos — Fase 2/3.
- Multi-hogar — no es un caso de uso.
- Chat de pareja, DMs — descartado en conversación.
- Reacciones, typing indicators, edición/borrado en chat — v2 del chat.
