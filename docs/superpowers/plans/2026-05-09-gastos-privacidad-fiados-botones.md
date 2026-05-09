# Gastos del Mes, Ocultar Números, Pago a Cuenta y Botones Visibles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar 4 features al sistema La Martina: página de Gastos del Mes con plantillas y navegación mensual, ocultamiento global de montos para privacidad, pago a cuenta por institución en Fiados, y botones de acción siempre visibles en todas las tablas.

**Architecture:** 3 tablas nuevas en Supabase (gastos_fijos, gastos_mes, pagos_cuenta). Un PrivacyContext global con localStorage. La página GastosMes.jsx maneja auto-seeding de gastos fijos al navegar a un mes sin registros. Los botones se cambian de patrón hover-only a siempre visibles con color de fondo.

**Tech Stack:** React 18, Vite, Tailwind CSS 3, Supabase (PostgreSQL + realtime), lucide-react, react-router-dom v6

---

## File Map

**Crear:**
- `src/context/PrivacyContext.jsx` — hideNumbers state + localStorage
- `src/pages/GastosMes.jsx` — página completa con modals

**Modificar:**
- `src/utils/db.js` — mappers + queries para 3 tablas nuevas
- `src/utils/currency.js` — agregar `formatAmount(value, hide)`
- `src/context/DataContext.jsx` — estado + CRUD + realtime para 3 tablas nuevas
- `src/App.jsx` — PrivacyProvider + ruta /gastos
- `src/components/layout/Sidebar.jsx` — ítem "Gastos"
- `src/components/layout/Header.jsx` — botón ocultar números
- `src/components/KPICard.jsx` — usar `formatAmount` con `usePrivacy`
- `src/pages/Dashboard.jsx` — `formatAmount` en montos
- `src/pages/Movimientos.jsx` — `formatAmount` + botones visibles
- `src/pages/Analytics.jsx` — `formatAmount`
- `src/pages/Fiados.jsx` — pagosCuenta + `formatAmount` + botones visibles
- `src/pages/Categorias.jsx` — botones visibles
- `src/pages/Usuarios.jsx` — botones visibles
- `src/pages/Productos.jsx` — botones visibles
- `src/pages/TrabajosColegio.jsx` — botones visibles
- `src/pages/TrabajosAnillado.jsx` — botones visibles

---

## Task 1: Supabase — Crear las 3 tablas nuevas

**Files:**
- No hay archivos de código. Ejecutar SQL en el dashboard de Supabase.

- [ ] **Step 1: Abrir el SQL editor de Supabase**

Ir a https://supabase.com → proyecto → SQL Editor → New query.

- [ ] **Step 2: Ejecutar el SQL**

```sql
-- Tabla de plantillas de gastos fijos
CREATE TABLE gastos_fijos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  monto_estimado numeric DEFAULT 0,
  activo boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Tabla de registros mensuales de gastos
CREATE TABLE gastos_mes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gasto_fijo_id uuid REFERENCES gastos_fijos(id) ON DELETE SET NULL,
  nombre text NOT NULL,
  monto numeric NOT NULL DEFAULT 0,
  mes text NOT NULL,
  pagado boolean DEFAULT false,
  pagado_at timestamptz,
  nota text,
  created_by uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Tabla de pagos a cuenta por institución
CREATE TABLE pagos_cuenta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id uuid NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  monto numeric NOT NULL,
  nota text,
  created_by uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
```

- [ ] **Step 3: Verificar**

En Supabase → Table Editor, confirmar que aparecen las 3 tablas: `gastos_fijos`, `gastos_mes`, `pagos_cuenta`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: tablas gastos_fijos, gastos_mes y pagos_cuenta en Supabase (sin código aún)"
```

---

## Task 2: db.js — Mappers y queries para las 3 tablas nuevas

**Files:**
- Modify: `src/utils/db.js`

- [ ] **Step 1: Agregar los 3 mappers al principio del archivo (después de `mapCierre`)**

Abrir `src/utils/db.js`. Después de la función `mapCierre`, agregar:

```js
function mapGastoFijo(g) {
  return {
    id: g.id,
    nombre: g.nombre,
    montoEstimado: Number(g.monto_estimado || 0),
    activo: g.activo,
    sortOrder: g.sort_order,
    createdAt: g.created_at,
  }
}

function mapGastoMes(g) {
  return {
    id: g.id,
    gastoFijoId: g.gasto_fijo_id,
    nombre: g.nombre,
    monto: Number(g.monto || 0),
    mes: g.mes,
    pagado: g.pagado,
    pagadoAt: g.pagado_at,
    nota: g.nota,
    createdBy: g.created_by,
    createdAt: g.created_at,
  }
}

function mapPagoCuenta(p) {
  return {
    id: p.id,
    institucionId: p.institucion_id,
    monto: Number(p.monto || 0),
    nota: p.nota,
    createdBy: p.created_by,
    createdAt: p.created_at,
  }
}
```

- [ ] **Step 2: Agregar los 3 namespaces al objeto `db` (al final, antes del cierre `}`)**

Al final del objeto `db` (después de la última coma del entry existente), agregar:

```js
  gastosFijos: {
    getAll: async () => {
      const { data, error } = await supabase.from('gastos_fijos').select('*').order('sort_order', { ascending: true })
      if (error) throw error
      return data.map(mapGastoFijo)
    },
    create: async (data) => {
      const { data: maxRow } = await supabase.from('gastos_fijos').select('sort_order').order('sort_order', { ascending: false }).limit(1).single()
      const nextSort = (maxRow?.sort_order ?? 0) + 1
      const { data: row, error } = await supabase.from('gastos_fijos').insert({
        nombre: data.nombre,
        monto_estimado: data.montoEstimado || 0,
        activo: data.activo ?? true,
        sort_order: nextSort,
      }).select().single()
      if (error) throw error
      return mapGastoFijo(row)
    },
    update: async (id, data) => {
      const patch = {}
      if (data.nombre !== undefined) patch.nombre = data.nombre
      if (data.montoEstimado !== undefined) patch.monto_estimado = data.montoEstimado
      if (data.activo !== undefined) patch.activo = data.activo
      const { data: row, error } = await supabase.from('gastos_fijos').update(patch).eq('id', id).select().single()
      if (error) throw error
      return mapGastoFijo(row)
    },
    delete: async (id) => {
      const { error } = await supabase.from('gastos_fijos').delete().eq('id', id)
      if (error) throw error
    },
  },

  gastosMes: {
    getAll: async () => {
      const { data, error } = await supabase.from('gastos_mes').select('*').order('created_at', { ascending: true })
      if (error) throw error
      return data.map(mapGastoMes)
    },
    seedMonth: async (mes, gastosFijos, createdBy) => {
      const rows = gastosFijos.filter(g => g.activo).map(g => ({
        gasto_fijo_id: g.id,
        nombre: g.nombre,
        monto: g.montoEstimado,
        mes,
        pagado: false,
        created_by: createdBy,
      }))
      if (rows.length === 0) return []
      const { data, error } = await supabase.from('gastos_mes').insert(rows).select()
      if (error) throw error
      return data.map(mapGastoMes)
    },
    create: async (data) => {
      const { data: row, error } = await supabase.from('gastos_mes').insert({
        gasto_fijo_id: data.gastoFijoId || null,
        nombre: data.nombre,
        monto: data.monto,
        mes: data.mes,
        pagado: data.pagado ?? false,
        nota: data.nota || null,
        created_by: data.createdBy,
      }).select().single()
      if (error) throw error
      return mapGastoMes(row)
    },
    update: async (id, data) => {
      const patch = {}
      if (data.nombre !== undefined) patch.nombre = data.nombre
      if (data.monto !== undefined) patch.monto = data.monto
      if (data.nota !== undefined) patch.nota = data.nota || null
      if (data.pagado !== undefined) {
        patch.pagado = data.pagado
        patch.pagado_at = data.pagado ? new Date().toISOString() : null
      }
      const { data: row, error } = await supabase.from('gastos_mes').update(patch).eq('id', id).select().single()
      if (error) throw error
      return mapGastoMes(row)
    },
    delete: async (id) => {
      const { error } = await supabase.from('gastos_mes').delete().eq('id', id)
      if (error) throw error
    },
  },

  pagosCuenta: {
    getAll: async () => {
      const { data, error } = await supabase.from('pagos_cuenta').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data.map(mapPagoCuenta)
    },
    create: async (data) => {
      const { data: row, error } = await supabase.from('pagos_cuenta').insert({
        institucion_id: data.institucionId,
        monto: data.monto,
        nota: data.nota || null,
        created_by: data.createdBy,
      }).select().single()
      if (error) throw error
      return mapPagoCuenta(row)
    },
    delete: async (id) => {
      const { error } = await supabase.from('pagos_cuenta').delete().eq('id', id)
      if (error) throw error
    },
  },
```

- [ ] **Step 3: Verificar que el archivo no tiene errores de sintaxis**

```bash
cd "C:/La martina" && node --input-type=module < src/utils/db.js 2>&1 | head -5
```

Si hay errores de sintaxis los verás en el output. Si muestra `Cannot find module` o `Error [ERR_MODULE_NOT_FOUND]` sobre supabase es normal (el módulo no resuelve fuera de Vite), pero los errores de sintaxis aparecen antes. Si el output está vacío, el archivo está bien.

- [ ] **Step 4: Commit**

```bash
git add src/utils/db.js
git commit -m "feat: mappers y queries para gastos_fijos, gastos_mes y pagos_cuenta"
```

---

## Task 3: DataContext — Estado, CRUD y realtime para las 3 tablas

**Files:**
- Modify: `src/context/DataContext.jsx`

- [ ] **Step 1: Agregar estado y refreshCallbacks (después de `const [trabajosAnillado, setTrabajosAnillado] = useState([])`)**

```js
const [gastosFijos, setGastosFijos] = useState([])
const [gastosMes, setGastosMes] = useState([])
const [pagosCuenta, setPagosCuenta] = useState([])
```

```js
const refreshGastosFijos = useCallback(async () => {
  try { setGastosFijos(await db.gastosFijos.getAll()) } catch { setGastosFijos([]) }
}, [])
const refreshGastosMes = useCallback(async () => {
  try { setGastosMes(await db.gastosMes.getAll()) } catch { setGastosMes([]) }
}, [])
const refreshPagosCuenta = useCallback(async () => {
  try { setPagosCuenta(await db.pagosCuenta.getAll()) } catch { setPagosCuenta([]) }
}, [])
```

- [ ] **Step 2: Agregar al `Promise.all` del `loadAll` (dentro del `useEffect` inicial)**

Localizar el bloque `await Promise.all([...])` y agregar las 3 llamadas nuevas:

```js
refreshGastosFijos(),
refreshGastosMes(),
refreshPagosCuenta(),
```

- [ ] **Step 3: Agregar subscripciones realtime**

Dentro del `useEffect` de realtime (el que tiene `.channel('db-changes')`), agregar antes del `.subscribe()`:

```js
.on('postgres_changes', { event: '*', schema: 'public', table: 'gastos_fijos' }, refreshGastosFijos)
.on('postgres_changes', { event: '*', schema: 'public', table: 'gastos_mes' }, refreshGastosMes)
.on('postgres_changes', { event: '*', schema: 'public', table: 'pagos_cuenta' }, refreshPagosCuenta)
```

- [ ] **Step 4: Agregar CRUD callbacks (después de los de Trabajos Anillado)**

```js
// --- Gastos Fijos ---
const createGastoFijo = useCallback(async (data) => { const item = await db.gastosFijos.create(data); await refreshGastosFijos(); return item }, [refreshGastosFijos])
const updateGastoFijo = useCallback(async (id, data) => { await db.gastosFijos.update(id, data); await refreshGastosFijos() }, [refreshGastosFijos])
const deleteGastoFijo = useCallback(async (id) => { await db.gastosFijos.delete(id); await refreshGastosFijos() }, [refreshGastosFijos])

// --- Gastos Mes ---
const createGastoMes = useCallback(async (data) => { const item = await db.gastosMes.create(data); await refreshGastosMes(); return item }, [refreshGastosMes])
const updateGastoMes = useCallback(async (id, data) => { await db.gastosMes.update(id, data); await refreshGastosMes() }, [refreshGastosMes])
const deleteGastoMes = useCallback(async (id) => { await db.gastosMes.delete(id); await refreshGastosMes() }, [refreshGastosMes])
const seedGastosMes = useCallback(async (mes, gastosFijosActuales, userId) => {
  const items = await db.gastosMes.seedMonth(mes, gastosFijosActuales, userId)
  await refreshGastosMes()
  return items
}, [refreshGastosMes])

// --- Pagos Cuenta ---
const createPagoCuenta = useCallback(async (data) => { const item = await db.pagosCuenta.create(data); await refreshPagosCuenta(); return item }, [refreshPagosCuenta])
const deletePagoCuenta = useCallback(async (id) => { await db.pagosCuenta.delete(id); await refreshPagosCuenta() }, [refreshPagosCuenta])
```

- [ ] **Step 5: Agregar todo al `value` del `DataContext.Provider`**

Dentro del objeto que se pasa a `value={{...}}`, agregar:

```js
gastosFijos, gastosMes, pagosCuenta,
createGastoFijo, updateGastoFijo, deleteGastoFijo,
createGastoMes, updateGastoMes, deleteGastoMes, seedGastosMes,
createPagoCuenta, deletePagoCuenta,
```

- [ ] **Step 6: Commit**

```bash
git add src/context/DataContext.jsx
git commit -m "feat: estado y CRUD para gastosFijos, gastosMes y pagosCuenta en DataContext"
```

---

## Task 4: PrivacyContext + formatAmount helper

**Files:**
- Create: `src/context/PrivacyContext.jsx`
- Modify: `src/utils/currency.js`

- [ ] **Step 1: Crear `src/context/PrivacyContext.jsx`**

```jsx
import React, { createContext, useContext, useState, useCallback } from 'react'

const PrivacyContext = createContext(null)

export function PrivacyProvider({ children }) {
  const [hideNumbers, setHideNumbers] = useState(() => {
    try { return localStorage.getItem('cg_hide_numbers') === 'true' } catch { return false }
  })

  const toggleHideNumbers = useCallback(() => {
    setHideNumbers(prev => {
      const next = !prev
      try { localStorage.setItem('cg_hide_numbers', String(next)) } catch {}
      return next
    })
  }, [])

  return (
    <PrivacyContext.Provider value={{ hideNumbers, toggleHideNumbers }}>
      {children}
    </PrivacyContext.Provider>
  )
}

export function usePrivacy() {
  const ctx = useContext(PrivacyContext)
  if (!ctx) throw new Error('usePrivacy must be used within PrivacyProvider')
  return ctx
}
```

- [ ] **Step 2: Agregar `formatAmount` a `src/utils/currency.js`**

Al final del archivo agregar:

```js
export function formatAmount(value, hide) {
  return hide ? '$ ••••' : formatARS(value)
}
```

- [ ] **Step 3: Commit**

```bash
git add src/context/PrivacyContext.jsx src/utils/currency.js
git commit -m "feat: PrivacyContext con hideNumbers y formatAmount helper"
```

---

## Task 5: App.jsx y Sidebar — PrivacyProvider y ruta /gastos

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/layout/Sidebar.jsx`

- [ ] **Step 1: Actualizar `src/App.jsx`**

Agregar el import al tope:

```jsx
import { PrivacyProvider } from './context/PrivacyContext'
import GastosMes from './pages/GastosMes'
```

Agregar la ruta dentro de `<Routes>` (después de `/anillado`):

```jsx
<Route path="/gastos" element={<PrivateRoute><GastosMes /></PrivateRoute>} />
```

Envolver `<ToastProvider>` con `<PrivacyProvider>`:

```jsx
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <PrivacyProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </PrivacyProvider>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
```

- [ ] **Step 2: Agregar ítem "Gastos" al Sidebar**

En `src/components/layout/Sidebar.jsx`, agregar el import de `Receipt`:

```jsx
import {
  LayoutDashboard, ArrowLeftRight, Tag, Users, BookOpen,
  Printer, BarChart2, Package, GraduationCap, Paperclip, Receipt,
} from 'lucide-react'
```

Agregar el ítem en el array `navItems`, después de `Fiados`:

```js
{ path: '/gastos', label: 'Gastos', icon: Receipt },
```

- [ ] **Step 3: Levantar dev server y verificar que `/gastos` no rompe nada**

```bash
npm run dev
```

Abrir http://localhost:5173, navegar a "Gastos" en el sidebar. Va a mostrar pantalla en blanco porque GastosMes.jsx no existe todavía — eso es esperado. Verificar que el resto de la app no rompió.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/components/layout/Sidebar.jsx
git commit -m "feat: ruta /gastos y PrivacyProvider en App, ítem Gastos en Sidebar"
```

---

## Task 6: Header — Botón ocultar números

**Files:**
- Modify: `src/components/layout/Header.jsx`

- [ ] **Step 1: Actualizar `src/components/layout/Header.jsx`**

Agregar imports:

```jsx
import { User, LogOut, ChevronDown, Shield, Eye, EyeOff } from 'lucide-react'
import { usePrivacy } from '../../context/PrivacyContext'
```

Agregar dentro del componente `Header()`, después de las líneas de `useAuth` y `useNavigate`:

```jsx
const { hideNumbers, toggleHideNumbers } = usePrivacy()
```

Agregar el botón en el JSX, dentro del `<header>`, entre la sección izquierda y el dropdown del usuario. Reemplazar la sección del `<div className="relative" ref={ref}>` para agregar el botón antes:

```jsx
<div className="flex items-center gap-3">
  {/* Botón ocultar números */}
  <button
    onClick={toggleHideNumbers}
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors"
    style={{
      borderColor: hideNumbers ? '#d1d5db' : '#e5e7eb',
      background: hideNumbers ? '#f3f4f6' : 'transparent',
      color: hideNumbers ? '#374151' : '#9ca3af',
    }}
    title={hideNumbers ? 'Mostrar montos' : 'Ocultar montos'}
  >
    {hideNumbers ? <EyeOff size={14} /> : <Eye size={14} />}
    {hideNumbers ? 'Oculto' : 'Visible'}
  </button>

  {/* Dropdown usuario (código existente) */}
  <div className="relative" ref={ref}>
    {/* ... resto igual ... */}
  </div>
</div>
```

- [ ] **Step 2: Verificar en el browser**

Con `npm run dev` corriendo, hacer click en el botón del Header. Los montos del Dashboard deben ocultarse (después del Task 8). Por ahora verificar que el botón toggle funciona visualmente.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Header.jsx
git commit -m "feat: botón ocultar/mostrar montos en Header"
```

---

## Task 7: KPICard — Integrar usePrivacy

**Files:**
- Modify: `src/components/KPICard.jsx`

- [ ] **Step 1: Actualizar `src/components/KPICard.jsx`**

Reemplazar el import de currency:

```jsx
import { formatAmount } from '../utils/currency'
import { usePrivacy } from '../context/PrivacyContext'
```

Agregar dentro del componente (antes del `return`):

```jsx
const { hideNumbers } = usePrivacy()
```

Reemplazar `{formatARS(amount)}` en el JSX por:

```jsx
{formatAmount(amount, hideNumbers)}
```

- [ ] **Step 2: Verificar**

Con `npm run dev`, ir al Dashboard. Al clickear el botón "Oculto" en el Header, las KPI cards deben mostrar `$ ••••`.

- [ ] **Step 3: Commit**

```bash
git add src/components/KPICard.jsx
git commit -m "feat: KPICard respeta hideNumbers via usePrivacy"
```

---

## Task 8: Dashboard y Analytics — formatAmount

**Files:**
- Modify: `src/pages/Dashboard.jsx`
- Modify: `src/pages/Analytics.jsx`

- [ ] **Step 1: Actualizar `src/pages/Dashboard.jsx`**

Agregar al import de currency:

```jsx
import { formatARS, formatAmount } from '../utils/currency'
```

Agregar `usePrivacy` import:

```jsx
import { usePrivacy } from '../context/PrivacyContext'
```

Agregar dentro del componente:

```jsx
const { hideNumbers } = usePrivacy()
```

Buscar todas las llamadas a `formatARS(` dentro del JSX (no las usadas en lógica de strings) y reemplazarlas por `formatAmount(` con segundo argumento `hideNumbers`. Ejemplos:

```jsx
// Antes:
{formatARS(kpi.cash)}
// Después:
{formatAmount(kpi.cash, hideNumbers)}
```

Las llamadas dentro de `addToast()` o strings de texto que no se muestran directamente en la UI pueden quedar con `formatARS`.

- [ ] **Step 2: Actualizar `src/pages/Analytics.jsx`**

Mismo patrón: agregar imports de `formatAmount` y `usePrivacy`, agregar `const { hideNumbers } = usePrivacy()`, reemplazar `formatARS(` → `formatAmount(` con `hideNumbers` en el JSX.

- [ ] **Step 3: Verificar**

Con `npm run dev`, ir a Dashboard y Analytics. Al clickear "Oculto" en el Header, todos los montos deben mostrar `$ ••••`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Dashboard.jsx src/pages/Analytics.jsx
git commit -m "feat: formatAmount con hideNumbers en Dashboard y Analytics"
```

---

## Task 9: GastosMes.jsx — Página completa

**Files:**
- Create: `src/pages/GastosMes.jsx`

- [ ] **Step 1: Crear `src/pages/GastosMes.jsx` con el contenido completo**

```jsx
import React, { useState, useMemo } from 'react'
import {
  Plus, Settings, Pencil, Trash2, Check, Loader2,
  Receipt, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { usePrivacy } from '../context/PrivacyContext'
import { formatAmount, formatARS } from '../utils/currency'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'

function getCurrentMes() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getMesLabel(mes) {
  const [year, month] = mes.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1, 1)
  return date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

function prevMes(mes) {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function nextMes(mes) {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ── Modal: agregar / editar gasto del mes ────────────────────────────────────
function GastoMesModal({ isOpen, onClose, gasto, mes, gastosFijos }) {
  const { createGastoMes, updateGastoMes } = useData()
  const { user } = useAuth()
  const { addToast } = useToast()
  const isEdit = !!gasto

  const [form, setForm] = useState({ nombre: '', monto: '', nota: '', gastoFijoId: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  React.useEffect(() => {
    if (!isOpen) return
    if (gasto) {
      setForm({ nombre: gasto.nombre, monto: String(gasto.monto), nota: gasto.nota || '', gastoFijoId: gasto.gastoFijoId || '' })
    } else {
      setForm({ nombre: '', monto: '', nota: '', gastoFijoId: '' })
    }
    setErrors({})
    setSaving(false)
  }, [isOpen, gasto])

  function validate() {
    const e = {}
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio'
    if (!form.monto || isNaN(parseFloat(form.monto)) || parseFloat(form.monto) < 0) e.monto = 'Ingresá un monto válido'
    return e
  }

  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      if (isEdit) {
        await updateGastoMes(gasto.id, { nombre: form.nombre.trim(), monto: parseFloat(form.monto), nota: form.nota.trim() })
        addToast('Gasto actualizado', 'success')
      } else {
        await createGastoMes({
          nombre: form.nombre.trim(), monto: parseFloat(form.monto),
          nota: form.nota.trim(), mes, gastoFijoId: form.gastoFijoId || null,
          createdBy: user.id,
        })
        addToast('Gasto registrado', 'success')
      }
      onClose()
    } catch {
      addToast('Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  function handlePlantillaChange(e) {
    const id = e.target.value
    const fijo = gastosFijos.find(g => g.id === id)
    setForm(f => ({ ...f, gastoFijoId: id, nombre: fijo ? fijo.nombre : f.nombre, monto: fijo && fijo.montoEstimado ? String(fijo.montoEstimado) : f.monto }))
    setErrors(p => ({ ...p, nombre: '', monto: '' }))
  }

  function set(field) {
    return e => { setForm(f => ({ ...f, [field]: e.target.value })); setErrors(p => ({ ...p, [field]: '' })) }
  }

  const activeFijos = gastosFijos.filter(g => g.activo)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Editar gasto' : 'Agregar gasto'} size="sm">
      <div className="flex flex-col gap-4">
        {!isEdit && activeFijos.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Basado en plantilla <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <select
              value={form.gastoFijoId}
              onChange={handlePlantillaChange}
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:border-primary-500 focus:ring-primary-500/20 appearance-none bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E\")] bg-[right_0.5rem_center] bg-no-repeat"
            >
              <option value="">Gasto libre (sin plantilla)</option>
              {activeFijos.map(g => (
                <option key={g.id} value={g.id}>
                  {g.nombre}{g.montoEstimado > 0 ? ` — est. ${formatARS(g.montoEstimado)}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
        <Input label="Concepto" placeholder="Ej: Agua, Luz, Proveedor..." value={form.nombre} onChange={set('nombre')} error={errors.nombre} autoFocus />
        <Input label="Monto" type="number" min="0" step="0.01" prefix="$" placeholder="0,00" value={form.monto} onChange={set('monto')} error={errors.monto} />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Nota <span className="text-gray-400 font-normal">(opcional)</span></label>
          <textarea rows={2} placeholder="Observaciones..." value={form.nota} onChange={set('nota')} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm resize-none focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
        </div>
        <div className="flex gap-3 pt-1">
          <Button variant="secondary" onClick={onClose} className="flex-1" disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} className="flex-1" disabled={saving}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : isEdit ? 'Guardar' : 'Agregar'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Modal: gestionar plantillas (admin) ───────────────────────────────────────
const EMPTY_FIJO = { nombre: '', montoEstimado: '' }

function PlantillasModal({ isOpen, onClose }) {
  const { gastosFijos, createGastoFijo, updateGastoFijo, deleteGastoFijo } = useData()
  const { addToast } = useToast()
  const [form, setForm] = useState(EMPTY_FIJO)
  const [editTarget, setEditTarget] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  function openEdit(g) { setEditTarget(g); setForm({ nombre: g.nombre, montoEstimado: String(g.montoEstimado) }); setErrors({}) }
  function cancelEdit() { setEditTarget(null); setForm(EMPTY_FIJO); setErrors({}) }

  function validate() {
    const e = {}
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio'
    return e
  }

  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    const data = { nombre: form.nombre.trim(), montoEstimado: parseFloat(form.montoEstimado) || 0 }
    setSaving(true)
    try {
      if (editTarget) {
        await updateGastoFijo(editTarget.id, data)
        addToast('Plantilla actualizada', 'success')
        cancelEdit()
      } else {
        await createGastoFijo(data)
        addToast('Plantilla creada', 'success')
        setForm(EMPTY_FIJO)
      }
    } catch {
      addToast('Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteGastoFijo(deleteTarget.id)
      addToast('Plantilla eliminada', 'info')
    } catch {
      addToast('Error al eliminar', 'error')
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  async function toggleActivo(g) {
    try {
      await updateGastoFijo(g.id, { activo: !g.activo })
    } catch {
      addToast('Error al actualizar', 'error')
    }
  }

  function set(field) {
    return e => { setForm(f => ({ ...f, [field]: e.target.value })); setErrors(p => ({ ...p, [field]: '' })) }
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Gestionar plantillas de gastos" size="md">
        <div className="flex flex-col gap-5">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              {editTarget ? `Editando: ${editTarget.nombre}` : 'Nueva plantilla'}
            </p>
            <div className="flex flex-col gap-3">
              <Input label="Nombre" placeholder="Ej: Agua, Luz, Proveedor Papel" value={form.nombre} onChange={set('nombre')} error={errors.nombre} />
              <Input label="Monto estimado (referencia)" type="number" min="0" step="0.01" prefix="$" placeholder="0,00" value={form.montoEstimado} onChange={set('montoEstimado')} />
              <div className="flex gap-2 pt-1">
                {editTarget && <Button variant="secondary" onClick={cancelEdit} size="sm">Cancelar</Button>}
                <Button onClick={handleSave} size="sm" disabled={saving} className="flex-1">
                  {saving ? <><Loader2 size={13} className="animate-spin" /> Guardando...</> : editTarget ? 'Guardar cambios' : 'Crear plantilla'}
                </Button>
              </div>
            </div>
          </div>

          {gastosFijos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No hay plantillas creadas aún</p>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Plantillas existentes</p>
              {gastosFijos.map(g => (
                <div key={g.id} className={`flex items-center gap-3 p-3 rounded-xl border bg-white ${g.activo ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{g.nombre}</p>
                    <p className="text-xs text-gray-400">{g.montoEstimado > 0 ? `Est. ${formatARS(g.montoEstimado)}` : 'Sin monto estimado'}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleActivo(g)}
                      className={`px-2 py-1 text-xs rounded-lg font-medium transition-colors ${g.activo ? 'bg-success-100 text-success-700 hover:bg-success-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      {g.activo ? 'Activa' : 'Inactiva'}
                    </button>
                    <button onClick={() => openEdit(g)} className="p-1.5 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setDeleteTarget(g)} className="p-1.5 bg-danger-50 text-danger-600 hover:bg-danger-100 rounded-lg transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Eliminar plantilla" size="sm">
        <p className="text-gray-600 mb-6">¿Eliminar la plantilla <strong>{deleteTarget?.nombre}</strong>? Los registros de gastos ya existentes no se borran.</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)} className="flex-1" disabled={deleting}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete} className="flex-1" disabled={deleting}>
            {deleting ? <><Loader2 size={14} className="animate-spin" /> Eliminando...</> : 'Eliminar'}
          </Button>
        </div>
      </Modal>
    </>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function GastosMes() {
  const { gastosFijos, gastosMes, updateGastoMes, deleteGastoMes, seedGastosMes } = useData()
  const { isAdmin, user } = useAuth()
  const { addToast } = useToast()
  const { hideNumbers } = usePrivacy()

  const [mes, setMes] = useState(getCurrentMes)
  const [seeding, setSeeding] = useState(false)
  const [gastoModal, setGastoModal] = useState({ open: false, gasto: null })
  const [plantillasOpen, setPlantillasOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState(null)

  const mesGastos = useMemo(() => gastosMes.filter(g => g.mes === mes), [gastosMes, mes])
  const activeTemplates = useMemo(() => gastosFijos.filter(g => g.activo), [gastosFijos])

  // Auto-seed cuando no hay registros para el mes y hay plantillas activas
  React.useEffect(() => {
    if (mesGastos.length === 0 && activeTemplates.length > 0 && !seeding) {
      setSeeding(true)
      seedGastosMes(mes, gastosFijos, user.id)
        .catch(() => {})
        .finally(() => setSeeding(false))
    }
  }, [mes]) // eslint-disable-line react-hooks/exhaustive-deps

  const kpi = useMemo(() => {
    const total = mesGastos.reduce((s, g) => s + g.monto, 0)
    const pagados = mesGastos.filter(g => g.pagado).reduce((s, g) => s + g.monto, 0)
    return { total, pagados, pendientes: total - pagados }
  }, [mesGastos])

  async function togglePagado(g) {
    setTogglingId(g.id)
    try {
      await updateGastoMes(g.id, { pagado: !g.pagado })
    } catch {
      addToast('Error al actualizar', 'error')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteGastoMes(deleteTarget.id)
      addToast('Gasto eliminado', 'info')
    } catch {
      addToast('Error al eliminar', 'error')
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const isCurrentMes = mes === getCurrentMes()

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gastos del Mes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Seguimiento de gastos operativos</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button variant="secondary" onClick={() => setPlantillasOpen(true)}>
              <Settings size={15} />
              Plantillas
            </Button>
          )}
          <Button onClick={() => setGastoModal({ open: true, gasto: null })}>
            <Plus size={16} />
            Agregar gasto
          </Button>
        </div>
      </div>

      {/* Navegación mes */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMes(prevMes(mes))}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-lg font-semibold text-gray-800 capitalize min-w-[200px] text-center">
          {getMesLabel(mes)}
        </span>
        <button
          onClick={() => setMes(nextMes(mes))}
          disabled={isCurrentMes}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} />
        </button>
        {!isCurrentMes && (
          <button onClick={() => setMes(getCurrentMes())} className="text-sm text-primary-600 hover:text-primary-800 font-medium">
            Ir a hoy
          </button>
        )}
        {seeding && <Loader2 size={14} className="animate-spin text-gray-400" />}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total del mes</p>
          <p className="text-2xl font-bold mt-1 tabular-nums text-gray-800">{formatAmount(kpi.total, hideNumbers)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pagados</p>
          <p className="text-2xl font-bold mt-1 tabular-nums text-success-700">{formatAmount(kpi.pagados, hideNumbers)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{mesGastos.filter(g => g.pagado).length} ítems</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pendientes</p>
          <p className={`text-2xl font-bold mt-1 tabular-nums ${kpi.pendientes > 0 ? 'text-danger-700' : 'text-gray-400'}`}>
            {formatAmount(kpi.pendientes, hideNumbers)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{mesGastos.filter(g => !g.pagado).length} ítems</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {mesGastos.length === 0 && !seeding ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
            <Receipt size={36} className="opacity-30" />
            <div className="text-center">
              <p className="font-medium text-gray-500">No hay gastos para este mes</p>
              <p className="text-sm mt-1">
                {activeTemplates.length > 0
                  ? 'Se generarán las plantillas activas. También podés agregar uno manualmente.'
                  : 'Agregá el primer gasto o creá plantillas desde el botón Plantillas.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Concepto', 'Monto', 'Estado', 'Nota', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mesGastos.map(g => (
                  <tr key={g.id} className={g.pagado ? 'opacity-70' : ''}>
                    <td className="px-4 py-3 font-medium text-gray-800">{g.nombre}</td>
                    <td className="px-4 py-3 tabular-nums font-semibold text-gray-800">{formatAmount(g.monto, hideNumbers)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => togglePagado(g)}
                        disabled={togglingId === g.id}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                          g.pagado ? 'bg-success-100 text-success-700 hover:bg-success-200' : 'bg-danger-100 text-danger-700 hover:bg-danger-200'
                        }`}
                      >
                        {togglingId === g.id
                          ? <Loader2 size={11} className="animate-spin" />
                          : g.pagado ? <Check size={11} /> : null}
                        {g.pagado ? 'Pagado' : 'Pendiente'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[200px]">
                      <span className="truncate block">{g.nota || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setGastoModal({ open: true, gasto: g })}
                          className="p-1.5 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(g)}
                          className="p-1.5 bg-danger-50 text-danger-600 hover:bg-danger-100 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <GastoMesModal
        isOpen={gastoModal.open}
        onClose={() => setGastoModal({ open: false, gasto: null })}
        gasto={gastoModal.gasto}
        mes={mes}
        gastosFijos={gastosFijos}
      />

      <PlantillasModal isOpen={plantillasOpen} onClose={() => setPlantillasOpen(false)} />

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Eliminar gasto" size="sm">
        <p className="text-gray-600 mb-6">
          ¿Eliminás el gasto <strong>"{deleteTarget?.nombre}"</strong> de <strong>{deleteTarget ? formatARS(deleteTarget.monto) : ''}</strong>?
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)} className="flex-1" disabled={deleting}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete} className="flex-1" disabled={deleting}>
            {deleting ? <><Loader2 size={14} className="animate-spin" /> Eliminando...</> : 'Eliminar'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
```

- [ ] **Step 2: Levantar dev server y verificar la página**

```bash
npm run dev
```

Navegar a http://localhost:5173/gastos. Verificar:
- Muestra el mes actual
- Flechas ← → navegan entre meses
- Botón "Agregar gasto" abre el modal
- Admin ve el botón "Plantillas"
- El botón "Oculto" del Header oculta los montos de la página

- [ ] **Step 3: Commit**

```bash
git add src/pages/GastosMes.jsx
git commit -m "feat: página GastosMes con plantillas, navegación mensual y auto-seed"
```

---

## Task 10: Fiados — Pago a Cuenta

**Files:**
- Modify: `src/pages/Fiados.jsx`

- [ ] **Step 1: Agregar imports y datos necesarios**

Al tope de `Fiados.jsx`, agregar en el import de `useData`:

```jsx
import { usePrivacy } from '../context/PrivacyContext'
import { formatAmount } from '../utils/currency'
```

En el componente `Fiados()`, agregar al destructuring de `useData`:

```jsx
const { ..., pagosCuenta, createPagoCuenta, deletePagoCuenta } = useData()
const { hideNumbers } = usePrivacy()
```

- [ ] **Step 2: Agregar el modal `PagoCuentaModal` (nuevo componente antes de la función `Fiados`)**

```jsx
function PagoCuentaModal({ isOpen, onClose, institucionId }) {
  const { createPagoCuenta } = useData()
  const { user } = useAuth()
  const { addToast } = useToast()
  const [monto, setMonto] = useState('')
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  React.useEffect(() => {
    if (isOpen) { setMonto(''); setNota(''); setError(''); setSaving(false) }
  }, [isOpen])

  async function handleSave() {
    const val = parseFloat(monto)
    if (!monto || isNaN(val) || val <= 0) { setError('Ingresá un monto válido'); return }
    setSaving(true)
    try {
      await createPagoCuenta({ institucionId, monto: val, nota: nota.trim(), createdBy: user.id })
      addToast(`Pago a cuenta de ${formatARS(val)} registrado`, 'success')
      onClose()
    } catch {
      setError('Error al registrar el pago')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar pago a cuenta" size="sm">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-600">
          Registrá un pago global a cuenta del saldo total de la institución. No modifica los fiados individuales.
        </p>
        <Input
          label="Monto del pago"
          type="number" min="0.01" step="0.01" prefix="$" placeholder="0,00"
          value={monto}
          onChange={e => { setMonto(e.target.value); setError('') }}
          error={error}
          autoFocus
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Nota <span className="text-gray-400 font-normal">(opcional)</span></label>
          <textarea rows={2} placeholder="Ej: Abono quincenal..." value={nota} onChange={e => setNota(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm resize-none focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
        </div>
        <div className="flex gap-3 pt-1">
          <Button variant="secondary" onClick={onClose} className="flex-1" disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} className="flex-1" disabled={saving}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> Registrando...</> : 'Registrar pago'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 3: Agregar estado y lógica en el componente `Fiados()`**

Agregar estado para el modal de pago a cuenta:

```jsx
const [pagoCuentaOpen, setPagoCuentaOpen] = useState(false)
```

Actualizar el `kpi` useMemo para incluir los pagos a cuenta de la institución seleccionada:

```jsx
const kpi = useMemo(() => {
  const pendiente = instFiados.filter((f) => !f.paid).reduce((s, f) => s + (f.amount - f.amountPaid), 0)
  const pagado = instFiados.filter((f) => f.paid).reduce((s, f) => s + f.amount, 0)
  const pagadoParcial = instFiados.filter((f) => !f.paid).reduce((s, f) => s + f.amountPaid, 0)
  const countPendiente = instFiados.filter((f) => !f.paid).length
  const totalPagosCuenta = pagosCuenta
    .filter(p => p.institucionId === selectedIdResolved)
    .reduce((s, p) => s + p.monto, 0)
  const saldoReal = pendiente - totalPagosCuenta
  return { pendiente, pagado: pagado + pagadoParcial, countPendiente, totalPagosCuenta, saldoReal }
}, [instFiados, pagosCuenta, selectedIdResolved])
```

- [ ] **Step 4: Reemplazar las 3 KPI cards por 4 en el JSX**

Localizar el bloque `<div className="grid grid-cols-3 gap-4">` con las KPI cards y reemplazarlo por:

```jsx
<div className="grid grid-cols-4 gap-4">
  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total pendiente</p>
    <p className={`text-2xl font-bold mt-1 tabular-nums ${kpi.pendiente > 0 ? 'text-danger-700' : 'text-gray-400'}`}>
      {formatAmount(kpi.pendiente, hideNumbers)}
    </p>
    <p className="text-xs text-gray-400 mt-0.5">{kpi.countPendiente} items sin cobrar</p>
  </div>
  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pagos a cuenta</p>
    <p className={`text-2xl font-bold mt-1 tabular-nums ${kpi.totalPagosCuenta > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
      {formatAmount(kpi.totalPagosCuenta, hideNumbers)}
    </p>
    <p className="text-xs text-gray-400 mt-0.5">Abonado sin asignar</p>
  </div>
  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Saldo real</p>
    <p className={`text-2xl font-bold mt-1 tabular-nums ${kpi.saldoReal > 0 ? 'text-danger-700' : kpi.saldoReal < 0 ? 'text-success-700' : 'text-gray-400'}`}>
      {formatAmount(kpi.saldoReal, hideNumbers)}
    </p>
    <p className="text-xs text-gray-400 mt-0.5">Pendiente − pagos a cuenta</p>
  </div>
  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total cobrado</p>
    <p className="text-2xl font-bold mt-1 tabular-nums text-success-700">{formatAmount(kpi.pagado, hideNumbers)}</p>
    <p className="text-xs text-gray-400 mt-0.5">{instFiados.filter((f) => f.paid).length} items cobrados</p>
  </div>
</div>
```

- [ ] **Step 4b: Reemplazar `formatARS` por `formatAmount` en las celdas de la tabla de fiados**

En el `<tbody>` de la tabla de fiados, reemplazar todas las ocurrencias de `{formatARS(` dentro del JSX por `{formatAmount(` con `, hideNumbers)`. Específicamente las celdas del monto del fiado y el saldo parcial. Las llamadas dentro de `addToast(` pueden quedar con `formatARS`.

- [ ] **Step 5: Agregar botón "Registrar pago a cuenta" junto al botón "Cobrar todo"**

Localizar el botón `<Button variant="success" size="sm" onClick={() => setConfirmAllOpen(true)}>` y agregar antes de él:

```jsx
<Button variant="secondary" size="sm" onClick={() => setPagoCuentaOpen(true)}>
  <Banknote size={14} />
  Pago a cuenta
</Button>
```

- [ ] **Step 6: Agregar historial de pagos a cuenta debajo de la tabla de fiados**

Después del cierre de `</div>` de la tabla (antes del cierre del bloque `{selected && (<>`))`), agregar:

```jsx
{/* Historial de pagos a cuenta */}
{pagosCuenta.filter(p => p.institucionId === selectedIdResolved).length > 0 && (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
    <div className="px-5 py-3 border-b border-gray-200">
      <span className="font-semibold text-gray-900 text-sm">Pagos a cuenta registrados</span>
    </div>
    <div className="divide-y divide-gray-100">
      {pagosCuenta
        .filter(p => p.institucionId === selectedIdResolved)
        .map(p => (
          <div key={p.id} className="flex items-center justify-between px-5 py-3">
            <div>
              <span className="font-semibold text-amber-700 tabular-nums">{formatAmount(p.monto, hideNumbers)}</span>
              {p.nota && <span className="text-sm text-gray-500 ml-2">— {p.nota}</span>}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleDateString('es-AR')}</span>
              {isAdmin && (
                <button
                  onClick={async () => { try { await deletePagoCuenta(p.id); addToast('Pago a cuenta eliminado', 'info') } catch { addToast('Error al eliminar', 'error') } }}
                  className="p-1.5 bg-danger-50 text-danger-600 hover:bg-danger-100 rounded-lg transition-colors"
                  title="Eliminar"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        ))}
    </div>
  </div>
)}
```

- [ ] **Step 7: Agregar el modal `PagoCuentaModal` al final del JSX (antes del cierre de `</div>` de la página)**

```jsx
<PagoCuentaModal
  isOpen={pagoCuentaOpen}
  onClose={() => setPagoCuentaOpen(false)}
  institucionId={selectedIdResolved}
/>
```

- [ ] **Step 8: Verificar en el browser**

Ir a /fiados, seleccionar una institución. Verificar:
- Aparecen 4 KPI cards (Total pendiente, Pagos a cuenta, Saldo real, Total cobrado)
- El botón "Pago a cuenta" abre el modal
- Al registrar un pago, aparece en el historial y el Saldo real se actualiza
- Admin puede eliminar pagos a cuenta del historial

- [ ] **Step 9: Commit**

```bash
git add src/pages/Fiados.jsx
git commit -m "feat: pago a cuenta por institución en Fiados con historial y saldo real"
```

---

## Task 11: formatAmount en Movimientos

**Files:**
- Modify: `src/pages/Movimientos.jsx`

- [ ] **Step 1: Agregar imports**

```jsx
import { formatARS, formatAmount } from '../utils/currency'
import { usePrivacy } from '../context/PrivacyContext'
```

- [ ] **Step 2: Agregar `hideNumbers` en el componente**

```jsx
const { hideNumbers } = usePrivacy()
```

- [ ] **Step 3: Reemplazar `formatARS(` por `formatAmount(` con `hideNumbers` en todo el JSX**

Buscar todas las ocurrencias de `{formatARS(` en el JSX de Movimientos y reemplazar por `{formatAmount(`, agregando `, hideNumbers)` como segundo argumento. Las llamadas dentro de `addToast()` pueden quedar con `formatARS`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Movimientos.jsx
git commit -m "feat: formatAmount con hideNumbers en Movimientos"
```

---

## Task 12: Botones siempre visibles en todas las páginas

**Files:**
- Modify: `src/pages/Movimientos.jsx`
- Modify: `src/pages/Fiados.jsx`
- Modify: `src/pages/Categorias.jsx`
- Modify: `src/pages/Usuarios.jsx`
- Modify: `src/pages/Productos.jsx`
- Modify: `src/pages/TrabajosColegio.jsx`
- Modify: `src/pages/TrabajosAnillado.jsx`

- [ ] **Step 1: En cada archivo, buscar el patrón hover-only y reemplazarlo**

En cada uno de los 7 archivos, buscar bloques como:

```jsx
<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
  <button className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg">
    <Pencil size={14} />
  </button>
  <button className="p-1.5 text-gray-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg">
    <Trash2 size={14} />
  </button>
</div>
```

Y reemplazarlos por este patrón (sin `opacity-0 group-hover:opacity-100`, con colores de fondo siempre activos):

```jsx
<div className="flex items-center gap-1">
  <button className="p-1.5 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors" title="Editar">
    <Pencil size={14} />
  </button>
  <button className="p-1.5 bg-danger-50 text-danger-600 hover:bg-danger-100 rounded-lg transition-colors" title="Eliminar">
    <Trash2 size={14} />
  </button>
</div>
```

Para botones de otros tipos, aplicar la convención de colores:
- Cobrar/Pagar: `bg-success-50 text-success-600 hover:bg-success-100`
- Pago parcial / Revertir: `bg-amber-50 text-amber-600 hover:bg-amber-100`

También en `Fiados.jsx` en el modal de instituciones (ManageInstituciones) se aplica el mismo cambio.

- [ ] **Step 2: Eliminar la clase `group` de las filas `<tr>` donde ya no se necesita**

Si el `<tr>` solo tenía `group` para controlar la visibilidad del botón, ya no hace falta. Remover `group` del className de esas filas para limpiar el código.

- [ ] **Step 3: Verificar en el browser**

Con `npm run dev`, navegar a cada página que tiene tabla y verificar que los botones de acción son siempre visibles y no requieren hover.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Movimientos.jsx src/pages/Fiados.jsx src/pages/Categorias.jsx src/pages/Usuarios.jsx src/pages/Productos.jsx src/pages/TrabajosColegio.jsx src/pages/TrabajosAnillado.jsx
git commit -m "feat: botones de acción siempre visibles en todas las tablas"
```

---

## Task 13: Build final y verificación

**Files:**
- No hay cambios de código.

- [ ] **Step 1: Build de producción**

```bash
npm run build
```

Esperado: build exitoso sin errores. Si hay warnings de TypeScript o imports no usados, corregirlos.

- [ ] **Step 2: Verificación completa**

Con `npm run dev`, recorrer la app y verificar:
- [ ] `/gastos` — crear plantilla, navegar meses, agregar gasto libre, marcar pagado
- [ ] Header — botón Visible/Oculto oculta todos los montos en todas las páginas
- [ ] `/fiados` — registrar pago a cuenta, ver historial, verificar saldo real
- [ ] `/movimientos` — botones siempre visibles, montos se ocultan con privacidad
- [ ] `/categorias`, `/usuarios`, `/productos`, `/trabajos-colegio`, `/anillado` — botones visibles

- [ ] **Step 3: Commit final**

```bash
git add -A
git commit -m "feat: verificación final — gastos del mes, privacidad, pago a cuenta y botones visibles"
```
