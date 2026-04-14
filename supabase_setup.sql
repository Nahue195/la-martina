-- ============================================================
-- Caja & Gastos – Fotocopiadora
-- Ejecutar este script en Supabase > SQL Editor > New query
-- ============================================================

-- 1. Tabla de usuarios
create table if not exists usuarios (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text unique not null,
  password text not null,
  role text not null default 'Empleado' check (role in ('Admin', 'Empleado')),
  created_at timestamptz default now() not null
);

-- 2. Tabla de categorías
create table if not exists categorias (
  id uuid default gen_random_uuid() primary key,
  type text not null check (type in ('Ingreso', 'Egreso')),
  name text not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz default now() not null
);

-- 3. Tabla de movimientos
create table if not exists movimientos (
  id uuid default gen_random_uuid() primary key,
  type text not null check (type in ('Ingreso', 'Egreso')),
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('Cash', 'QRTransfer', 'Card')),
  category_id uuid references categorias(id) on delete set null,
  note text,
  created_at timestamptz default now() not null,
  created_by uuid references usuarios(id) on delete set null
);

-- 4. Deshabilitar RLS (app interna, sin acceso público)
alter table usuarios disable row level security;
alter table categorias disable row level security;
alter table movimientos disable row level security;

-- 5. Habilitar Realtime (sincronización en tiempo real entre PCs)
alter publication supabase_realtime add table movimientos;
alter publication supabase_realtime add table categorias;
alter publication supabase_realtime add table usuarios;

-- 6. Datos iniciales: usuarios
insert into usuarios (id, name, email, password, role) values
  ('11111111-1111-1111-1111-111111111111', 'Administrador', 'admin', 'admin123', 'Admin'),
  ('22222222-2222-2222-2222-222222222222', 'Empleado', 'empleado', 'emp123', 'Empleado')
on conflict (email) do nothing;

-- 7. Datos iniciales: categorías
insert into categorias (type, name, active, sort_order) values
  ('Ingreso', 'Fotocopias',    true,  1),
  ('Ingreso', 'Impresiones',   true,  2),
  ('Ingreso', 'Anillados',     true,  3),
  ('Ingreso', 'Plastificados', true,  4),
  ('Ingreso', 'Útiles',        true,  5),
  ('Ingreso', 'Otros',         true,  6),
  ('Egreso',  'Papel',         true,  7),
  ('Egreso',  'Toner/Tinta',   true,  8),
  ('Egreso',  'Mantenimiento', true,  9),
  ('Egreso',  'Alquiler',      true, 10),
  ('Egreso',  'Servicios',     true, 11),
  ('Egreso',  'Proveedores',   true, 12),
  ('Egreso',  'Impuestos',     true, 13),
  ('Egreso',  'Caja chica',    true, 14),
  ('Egreso',  'Otros',         true, 15);
