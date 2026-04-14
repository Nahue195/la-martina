import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Faltan variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. Copiá .env.example a .env y completá los valores.')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
