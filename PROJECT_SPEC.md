# Asistente Familiar — Especificación del Proyecto

## Contexto

Sistema tipo "SO familiar" para un hogar de 7 personas + una perra (Roma). Sustituye la dispersión actual entre Google Keep, Tasks, Calendar y otras apps, unificando en una sola PWA.

**Usuarios:**
- **JC y Cris** (admins, pareja): acceso total incluido finanzas y documentos privados
- **5 miembros más** (members): 2 pequeños con régimen fijo (finde + vacaciones), 3 adolescentes con presencia variable
- **Roma**: perra mestiza nacida 17/11/2024, sujeto de gestión (peso, vet, paseos)

**Ubicación:** Alcorcón, Madrid, España. Calendario escolar Comunidad de Madrid.

**Dispositivos:** Mezcla de iPhone, Android y ordenadores. Por eso PWA única, no nativo.

## Estrategia de construcción

**Principio rector:** validar uso real antes de añadir complejidad o coste.

1. **Arrancar sin IA ni canales externos.** Fases 1 y 2 son PWA pura con input manual bien diseñado. Cero coste recurrente más allá del plan free de Supabase y Vercel.
2. **Medir adopción.** Antes de añadir Claude API o Telegram, comprobar que los 7 miembros usan la app de forma estable al menos 4-6 semanas.
3. **Añadir IA cuando aporte valor claro.** Primera integración de Claude API justificada por un problema concreto (ej: parsear facturas automáticamente), no por "que quede guay".
4. **Telegram como último atajo.** Solo si tras uso real se detecta fricción específica que un bot resuelve mejor que la PWA.

## Principios de diseño

1. **PWA desde el día 1.** Instalable en iOS y Android, funciona en desktop, un solo código, un solo deploy.
2. **Input manual excelente antes que IA mediocre.** Quick-add con parseo local ligero (fechas, cantidades) > formulario completo. Nada de atajos mágicos que fallen el 20% de las veces.
3. **Modelo de datos polimórfico.** Una tabla `items` con `type` discriminador y `data jsonb` para campos específicos. Evita explosión de tablas y permite vistas unificadas.
4. **Permisos en la base de datos (RLS), no en la UI.** Tres scopes: `family`, `couple`, `personal`.
5. **Presencia como eje transversal.** Quién está cada día alimenta compra, menús, rotación de tareas, paseos de Roma, planes.
6. **Offline-friendly.** Service worker con escritura optimista y queue de mutaciones en IndexedDB.
7. **Todo en español.** No perder tiempo en i18n.

## Stack

### Fase inicial (sin coste por uso)
- **Backend:** Supabase (Postgres 15 + Auth + Storage + Realtime + pgvector)
- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui, desplegado en Vercel
- **PWA:** Serwist (service worker moderno, compatible con App Router)
- **Parseo local:** `chrono-node` para fechas en lenguaje natural, sin coste

### Se añade cuando toque (con coste)
- **Claude API** (cuando un módulo concreto lo justifique)
- **n8n** self-hosted en Railway (cuando haya flujos que orquestar)
- **Telegram Bot API** (último recurso si se identifica fricción real)

## Módulos (por orden de construcción)

### Fase 1 — Núcleo + lo esencial diario + PWA (sin IA)

- Inicialización Next.js + Supabase + Tailwind + shadcn/ui
- Configuración PWA completa con Serwist
- Auth + onboarding del hogar (7 miembros, 2 admin)
- Modelo de datos completo con RLS
- **Input manual bien diseñado:** formularios rápidos, quick-add con parseo local de fechas vía `chrono-node`
- Módulo Presencia (régimen automático pequeños configurable + checkin manual adolescentes)
- Módulo Calendario familiar
- Módulo Tareas (individuales y rotativas)
- Módulo Compra y Despensa
- Dashboard con tarjetas reordenables
- Resumen diario matutino básico (generado con lógica, no IA)

### Fase 2 — Hogar completo (sin IA todavía)
- Módulo Roma (peso, vet, paseos, gastos)
- Módulo Proyectos (mudanza, reforma, red casa)
- Módulo Personas (fichas individuales, documentos personales, citas médicas)
- Módulo Menús + recetario (selección manual, no generación IA)
- Rotación inteligente de tareas domésticas según presencia (reglas, no IA)
- Sincronización calendario escolar Madrid (scraping/import manual)

### 🚦 Checkpoint de validación
Tras Fase 2, evaluar uso real durante 4-6 semanas. Solo continuar si:
- Los 7 miembros tienen la PWA instalada y activa
- Hay al menos 1 interacción diaria promedio por usuario adulto
- Se identifican dolores concretos que justifiquen las fases siguientes

### Fase 3 — Primera IA: documentos
Primera introducción de Claude API, con caso de uso claro y coste medible.
- Storage de documentos (foto + PDF)
- Extracción automática con Claude de facturas, contratos, recetas médicas
- Embeddings pgvector + búsqueda semántica
- Módulo Contactos útiles
- Estimación de coste por documento procesado documentada

### Fase 4 — Proactividad e integraciones
- Gmail integration vía n8n (parseo facturas, reservas)
- Bot Telegram para captura rápida y checkin adolescentes (si validado)
- Alertas inteligentes cruzadas
- Resumen semanal dominical mejorado con IA
- Notificaciones push (Web Push API con VAPID)

### Fase 5 — Finanzas
- Carga manual de extractos (PDF/CSV) con parseo por Claude
- Categorización y presupuestos
- Suscripciones y renovaciones
- Acumulador gastos deducibles renta
- Futuro: Open Banking vía GoCardless (PSD2)

### Fase 6 — Ocio y otros
- Módulo Viajes
- Módulo Coche
- Ideas de planes, sitios, películas/series

## Modelo de datos (esqueleto)

```
households (id, name)

household_members (
  id, household_id, user_id,
  display_name, avatar_url, birthdate,
  role text check (role in ('admin','member')),
  member_type text check (member_type in ('adult','teen','child')),
  presence_pattern jsonb  -- régimen por defecto
)

projects (
  id, household_id, name, emoji, color,
  scope text check (scope in ('family','couple','personal')),
  owner_id, archived, created_at
)

items (
  id, household_id, project_id nullable,
  type text check (type in ('task','event','shopping','pantry','document','transaction','note','walk','weight','vet_visit','menu','recipe','subscription','vehicle_entry')),
  scope text check (scope in ('family','couple','personal')),
  title, description,
  data jsonb,  -- campos específicos por type
  due_at, completed_at, recurrence jsonb,
  created_by, assigned_to nullable,
  created_at, updated_at
)

presence (
  id, household_id, member_id,
  date, status text check (status in ('home','away','uncertain')),
  notes, updated_by, updated_at
)

embeddings (
  id, item_id, content, embedding vector(1536)
  -- tabla creada vacía en Fase 1, se empieza a poblar en Fase 3
)

interactions (
  id, user_id, input_text, input_channel,
  intent, resulting_item_id, created_at
  -- útil desde Fase 1 para analítica de uso propia
)

school_calendar (
  id, date, type text check (type in ('school_day','holiday','weekend','vacation')),
  description
)
```

## RLS — resumen

- **family**: cualquier miembro del household puede leer/escribir
- **couple**: solo `role = 'admin'` del household
- **personal**: solo `created_by = auth.uid()`

## Requisitos PWA específicos

- Manifest con `display: standalone`, `theme_color`, `background_color` coherentes
- Iconos: 192, 384, 512 (Android) + 180x180 apple-touch-icon (iOS)
- Splash screens iOS generadas con `pwa-asset-generator` o similar
- Meta tags: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title`
- Service worker con Serwist:
  - Network-first para llamadas a Supabase
  - Cache-first para assets estáticos
  - Fallback offline para rutas principales
- IndexedDB (vía Dexie o idb) para queue de mutaciones offline
- Push notifications (Fase 4): VAPID keys, endpoint de suscripción en Supabase

## Parseo local en Fase 1 (sustituto de IA)

Para que el quick-add no parezca "tonto" aun sin Claude, usar `chrono-node`:

- "Compra pienso mañana" → tarea con `due_at = mañana 09:00`
- "Vet Roma viernes 18h" → evento `due_at = próximo viernes 18:00`
- "2kg patatas" → item de compra con `data.quantity = 2`, `data.unit = kg`

Es determinista, gratis y funciona bien para el 80% de los casos cotidianos. Lo que no parsee cae en formulario normal.

## Autenticación

- Usuario + password (no email, no OAuth). Los 7 miembros tienen login desde el principio.
- Supabase Auth internamente usa `<username>@peumayen.local` como email sintético.
- Sin signup público: el primer admin crea el hogar y las cuentas del resto.
- Recuperación manual de contraseñas por admin (no hay email).

## Decisiones pendientes

- Proveedor de voz a texto cuando toque (Fase 3+): Web Speech API (gratis, calidad variable) vs Whisper API (calidad alta, coste por minuto)
- Estrategia exacta de sync offline: resolver conflictos last-write-wins vs merge manual
- Si usar Supabase Realtime para colaboración en vivo (lista de la compra con varios a la vez) o bastar con polling
