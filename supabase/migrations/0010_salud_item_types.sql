-- Amplía el check constraint de items.type para incluir los tipos del módulo Salud
alter table public.items
  drop constraint if exists items_type_check;

alter table public.items
  add constraint items_type_check check (type in (
    'task', 'event', 'shopping', 'pantry', 'document', 'transaction',
    'note', 'walk', 'weight', 'vet_visit', 'menu', 'recipe',
    'subscription', 'vehicle_entry',
    'retainer_change', 'period_day', 'health_settings'
  ));
