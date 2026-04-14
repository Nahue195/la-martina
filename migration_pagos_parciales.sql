-- Ejecutar en Supabase → SQL Editor
ALTER TABLE fiados ADD COLUMN IF NOT EXISTS amount_paid numeric(10,2) NOT NULL DEFAULT 0;
