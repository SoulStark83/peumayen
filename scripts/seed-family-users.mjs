#!/usr/bin/env node
/**
 * Seed script — crea usuarios de la familia + miembros en el hogar.
 *
 * Uso:
 *   FAMILY_PASSWORD="tu-password" node scripts/seed-family-users.mjs
 *
 * Requiere en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (Project settings → API → service_role)
 *   NEXT_PUBLIC_AUTH_EMAIL_DOMAIN (opcional, por defecto "peumayen.local")
 *
 * Idempotente: si un usuario ya existe se reutiliza y se actualiza
 * su password. Si el household_member ya existe (mismo user_id) lo deja.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, k, v] = m;
    if (!(k in process.env)) process.env[k] = v.replace(/^"(.*)"$/, "$1");
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DOMAIN = process.env.NEXT_PUBLIC_AUTH_EMAIL_DOMAIN ?? "peumayen.local";
const PASSWORD = process.env.FAMILY_PASSWORD;

if (!SUPABASE_URL || !SERVICE) {
  console.error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}
if (!PASSWORD || PASSWORD.length < 8) {
  console.error('Falta FAMILY_PASSWORD (min 8 chars). Ej: FAMILY_PASSWORD="xxx" node scripts/seed-family-users.mjs');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

// --- Definición familia ---
const USERS = [
  { username: "cris",  display_name: "Cris",  role: "admin",  member_type: "adult" },
  { username: "lucia", display_name: "Lucía", role: "member", member_type: "child" },
  { username: "sergi", display_name: "Sergi", role: "member", member_type: "child" },
  { username: "biel",  display_name: "Biel",  role: "member", member_type: "child" },
  { username: "pablo", display_name: "Pablo", role: "member", member_type: "child" },
  { username: "ali",   display_name: "Ali",   role: "member", member_type: "child" },
];

function usernameToEmail(u) {
  return `${u.trim().toLowerCase()}@${DOMAIN}`;
}

// --- Detectar hogar ---
const { data: households, error: hhErr } = await admin.from("households").select("id, name");
if (hhErr) { console.error("Error leyendo households:", hhErr.message); process.exit(1); }
if (!households || households.length === 0) {
  console.error("No hay ningún hogar en la base. Crea el tuyo primero desde /onboarding.");
  process.exit(1);
}
if (households.length > 1) {
  console.error("Hay más de un hogar. Define HOUSEHOLD_ID en el entorno.");
  console.error(households.map((h) => `- ${h.id}  ${h.name}`).join("\n"));
  process.exit(1);
}
const household = households[0];
console.log(`Hogar detectado: ${household.name} (${household.id})\n`);

// --- Listar usuarios existentes (para idempotencia) ---
const existingByEmail = new Map();
let page = 1;
while (true) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) { console.error("listUsers:", error.message); process.exit(1); }
  for (const u of data.users) existingByEmail.set(u.email?.toLowerCase(), u);
  if (data.users.length < 200) break;
  page++;
}

// --- Crear / actualizar cada uno ---
for (const u of USERS) {
  const email = usernameToEmail(u.username);
  let authUser = existingByEmail.get(email);

  if (authUser) {
    const { error } = await admin.auth.admin.updateUserById(authUser.id, { password: PASSWORD });
    if (error) { console.error(`  [${u.username}] update:`, error.message); continue; }
    console.log(`  [${u.username}] usuario existente → password actualizada`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) { console.error(`  [${u.username}] create:`, error.message); continue; }
    authUser = data.user;
    console.log(`  [${u.username}] creado (${authUser.id})`);
  }

  const { data: existingMember } = await admin
    .from("household_members")
    .select("id")
    .eq("household_id", household.id)
    .eq("user_id", authUser.id)
    .maybeSingle();

  if (existingMember) {
    console.log(`    miembro ya existía (${existingMember.id}) — sin cambios`);
    continue;
  }

  const { data: member, error: memErr } = await admin
    .from("household_members")
    .insert({
      household_id: household.id,
      user_id: authUser.id,
      display_name: u.display_name,
      role: u.role,
      member_type: u.member_type,
    })
    .select("id")
    .single();
  if (memErr) { console.error(`    insert member:`, memErr.message); continue; }
  console.log(`    miembro creado (${member.id}, ${u.role}/${u.member_type})`);
}

console.log("\nListo.");
