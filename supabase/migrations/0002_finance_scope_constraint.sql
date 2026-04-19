-- =============================================================================
-- Peumayen — Finanzas: blindar que transacciones y suscripciones son couple
-- =============================================================================
-- Solo los admins (JC y Cris) pueden ver finanzas. El scope 'couple' ya limita
-- la visibilidad vía RLS (is_admin). Este constraint evita que un insert con
-- scope != 'couple' deje datos financieros visibles al resto del hogar por
-- error humano o cliente manipulado.

-- Normalizar datos existentes antes de aplicar el check.
update public.items
   set scope = 'couple'
 where type in ('transaction', 'subscription')
   and scope <> 'couple';

alter table public.items
  add constraint items_finance_scope_couple
  check (type not in ('transaction', 'subscription') or scope = 'couple');
