-- =============================================================================
-- Salud: indexes for health item queries (retainer_change, period_day, health_settings)
-- No new tables needed — uses existing polymorphic items table with scope='personal'
-- =============================================================================

-- Composite index for fetching personal health items by member
create index if not exists items_personal_health_idx
  on public.items (household_id, created_by, type)
  where scope = 'personal';
