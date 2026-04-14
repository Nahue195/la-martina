-- ============================================================
-- Módulo de Fiados
-- Ejecutar en Supabase > SQL Editor > New query
-- ============================================================

-- 1. Tabla de instituciones (escuelas, institutos, etc.)
create table if not exists instituciones (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  color text not null default '#2563EB',
  active boolean not null default true,
  created_at timestamptz default now() not null
);

-- 2. Tabla de fiados
create table if not exists fiados (
  id uuid default gen_random_uuid() primary key,
  institucion_id uuid references instituciones(id) on delete cascade,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  paid boolean not null default false,
  paid_at timestamptz,
  note text,
  created_at timestamptz default now() not null,
  created_by uuid references usuarios(id) on delete set null
);

-- 3. Deshabilitar RLS
alter table instituciones disable row level security;
alter table fiados disable row level security;

-- 4. Habilitar Realtime
alter publication supabase_realtime add table instituciones;
alter publication supabase_realtime add table fiados;
