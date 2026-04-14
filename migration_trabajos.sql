-- ============================================================
-- Ejecutar este SQL en el panel de Supabase (SQL Editor)
-- ============================================================

-- Trabajos de Colegio: fotocopias dejadas por profesores para alumnos
CREATE TABLE IF NOT EXISTS trabajos_colegio (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escuela          text NOT NULL,
  grado            text NOT NULL,
  materia          text NOT NULL,
  profesor         text,
  descripcion      text,
  cantidad_copias  integer NOT NULL DEFAULT 1,
  cantidad_alumnos integer,
  precio_por_copia numeric(10,2) NOT NULL DEFAULT 0,
  estado           text NOT NULL DEFAULT 'pendiente'
                     CHECK (estado IN ('pendiente', 'parcial', 'completado')),
  fecha_ingreso    date NOT NULL DEFAULT CURRENT_DATE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       text
);

ALTER TABLE trabajos_colegio DISABLE ROW LEVEL SECURITY;

-- Trabajos de Anillado: encuadernación para clientes con fecha de entrega
CREATE TABLE IF NOT EXISTS trabajos_anillado (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente        text NOT NULL,
  telefono       text,
  descripcion    text NOT NULL,
  cantidad       integer NOT NULL DEFAULT 1,
  tipo_anillado  text NOT NULL DEFAULT 'espiral'
                   CHECK (tipo_anillado IN ('espiral', 'tapa_dura', 'rustica')),
  fecha_entrega  date NOT NULL,
  precio         numeric(10,2),
  estado         text NOT NULL DEFAULT 'pendiente'
                   CHECK (estado IN ('pendiente', 'en_proceso', 'listo', 'entregado')),
  notas          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     text
);

ALTER TABLE trabajos_anillado DISABLE ROW LEVEL SECURITY;

-- Archivos PDF adjuntos a trabajos de colegio
CREATE TABLE IF NOT EXISTS archivos_colegio (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trabajo_id  uuid NOT NULL REFERENCES trabajos_colegio(id) ON DELETE CASCADE,
  nombre      text NOT NULL,
  path        text NOT NULL,
  size        integer,
  uploaded_by text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE archivos_colegio DISABLE ROW LEVEL SECURITY;

-- Archivos PDF adjuntos a trabajos de anillado
CREATE TABLE IF NOT EXISTS archivos_anillado (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trabajo_id  uuid NOT NULL REFERENCES trabajos_anillado(id) ON DELETE CASCADE,
  nombre      text NOT NULL,
  path        text NOT NULL,
  size        integer,
  uploaded_by text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE archivos_anillado DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- STORAGE: crear buckets y políticas de acceso
-- ============================================================

-- Crear buckets (si ya los creaste manualmente, esto los actualiza a public=true)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('archivos-colegio',  'archivos-colegio',  true, 52428800, ARRAY['application/pdf']),
  ('archivos-anillado', 'archivos-anillado', true, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas: permitir todas las operaciones (lectura, escritura, eliminación)
DROP POLICY IF EXISTS "allow_all_archivos_colegio"  ON storage.objects;
DROP POLICY IF EXISTS "allow_all_archivos_anillado" ON storage.objects;

CREATE POLICY "allow_all_archivos_colegio" ON storage.objects
  FOR ALL TO public
  USING      (bucket_id = 'archivos-colegio')
  WITH CHECK (bucket_id = 'archivos-colegio');

CREATE POLICY "allow_all_archivos_anillado" ON storage.objects
  FOR ALL TO public
  USING      (bucket_id = 'archivos-anillado')
  WITH CHECK (bucket_id = 'archivos-anillado');
