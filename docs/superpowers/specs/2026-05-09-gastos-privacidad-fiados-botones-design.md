# Spec: Gastos del Mes, Ocultar Números, Pago a Cuenta, Botones Visibles

**Fecha:** 2026-05-09  
**Proyecto:** La Martina – Sistema de Caja (Fotocopiadora)  
**Stack:** React 18 + Vite + Tailwind CSS 3 + Supabase

---

## Resumen

Se agregan 4 features al sistema existente:

1. **Gastos del Mes** — nueva página para registrar gastos operativos fijos y variables (agua, luz, proveedor, etc.) con navegación mensual e historial.
2. **Ocultar Números** — botón global en el Header que oculta todos los montos de la app con `$ ••••` para privacidad visual.
3. **Pago a Cuenta (Fiados)** — permite registrar pagos globales a cuenta de una institución sin tocar los fiados individuales.
4. **Botones Siempre Visibles** — elimina el patrón hover-only en todas las tablas; los botones de acción quedan siempre visibles con color de fondo.

---

## Feature 1: Gastos del Mes

### Objetivo

Página dedicada para registrar y hacer seguimiento de los gastos operativos del negocio (agua, luz, proveedores, etc.), separada del flujo de caja diario.

### Datos en Supabase

**Tabla `gastos_fijos`** — plantillas de gastos recurrentes:

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | PK |
| `nombre` | text | Ej: "Agua", "Luz", "Proveedor Papel" |
| `monto_estimado` | numeric | Importe habitual (referencia, no obligatorio) |
| `activo` | boolean | Para ocultar sin borrar |
| `sort_order` | integer | Orden en la lista |
| `created_at` | timestamptz | |

**Tabla `gastos_mes`** — registros mensuales reales:

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | PK |
| `gasto_fijo_id` | uuid | FK a `gastos_fijos` (null si es gasto variable) |
| `nombre` | text | Copiado del fijo o libre si es variable |
| `monto` | numeric | Monto real pagado |
| `mes` | text | Formato `"YYYY-MM"` (ej: `"2026-05"`) |
| `pagado` | boolean | Default false |
| `pagado_at` | timestamptz | Fecha/hora de marcado como pagado |
| `nota` | text | Observaciones opcionales |
| `created_by` | uuid | FK a usuarios |
| `created_at` | timestamptz | |

### Comportamiento

- Al navegar a cualquier mes (incluido el mes actual al entrar a la página), si no existen registros en `gastos_mes` para ese mes, se **pre-generan automáticamente** los gastos fijos activos con `monto = monto_estimado` y `pagado = false`. Esta lógica corre en el cliente al cambiar el mes activo.
- Navegación mes a mes con botones ← →.
- Se pueden agregar gastos variables adicionales (sin `gasto_fijo_id`) en cualquier mes.
- Se pueden editar montos en cualquier gasto del mes (el `monto_estimado` es solo referencia).
- Se pueden marcar como pagados, lo que registra `pagado_at`.

### UI

- **Sidebar**: ítem "Gastos" con ícono `Receipt` (visible para ambos roles).
- **KPIs** en la parte superior: Total del mes / Pagados / Pendientes.
- **Tabla** con columnas: Concepto · Monto · Estado · Nota · Acciones.
- **Botón "⚙ Plantillas"** (admin only) abre modal para gestionar `gastos_fijos`.
- **Botón "+ Agregar gasto"** abre modal para crear un gasto variable del mes.
- Estado: badge verde "Pagado" / badge rojo "Pendiente", clickeable para toggle.

### Permisos

- **Admin**: gestionar plantillas (crear, editar, activar/desactivar, eliminar).
- **Empleado**: ver, marcar como pagado, editar monto de gastos del mes.

---

## Feature 2: Ocultar Números

### Objetivo

Botón global en el Header que reemplaza todos los montos visibles de la app por `$ ••••`, para cuando hay clientes o terceros cerca de la pantalla.

### Implementación

- Nuevo **`PrivacyContext`** (`src/context/PrivacyContext.jsx`) con:
  - `hideNumbers: boolean`
  - `toggleHideNumbers: () => void`
  - Persiste en `localStorage` con key `cg_hide_numbers`.
- Nuevo helper **`formatAmount(value, hideNumbers)`** en `src/utils/currency.js`:
  - Si `hideNumbers = true` → retorna `"$ ••••"`
  - Si `hideNumbers = false` → retorna `formatARS(value)` como siempre
- **Header** (`src/components/layout/Header.jsx`): botón `👁 Visible` / `👁‍🗨 Oculto` entre el badge Admin y el dropdown de usuario. Llama a `toggleHideNumbers()`.
- Todos los componentes que muestran montos (`KPICard`, `Dashboard`, `Fiados`, `Movimientos`, `Analytics`, `GastosMes`, etc.) usan `formatAmount` en lugar de `formatARS` directamente.

### UX

- El botón tiene dos estados visuales claros: fondo blanco con borde (visible) vs fondo gris con borde más oscuro (oculto).
- El estado persiste entre recargas de página (localStorage).
- El estado NO es por usuario — es por dispositivo/sesión.

---

## Feature 3: Pago a Cuenta (Fiados)

### Objetivo

Registrar que una institución realizó un pago global a cuenta de su deuda total, sin modificar los fiados individuales pendientes. Permite llevar trazabilidad de pagos parciales a nivel institución.

### Datos en Supabase

**Tabla `pagos_cuenta`**:

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | PK |
| `institucion_id` | uuid | FK a `instituciones` |
| `monto` | numeric | Monto del pago |
| `nota` | text | Descripción opcional |
| `created_by` | uuid | FK a usuarios |
| `created_at` | timestamptz | |

### Cálculo de saldo

```
saldo_real = Σ(fiados pendientes de la institución) - Σ(pagos_cuenta de la institución)
```

El `saldo_real` puede ser negativo si se pagó más de lo adeudado (saldo a favor).

### UI en Fiados

- Los **KPIs** de la institución pasan de 3 a 4 cards:
  - Total pendiente (suma de fiados sin cobrar)
  - Pagos a cuenta (suma de `pagos_cuenta`)
  - Saldo real (= pendiente − pagos a cuenta) — destacado en rojo/verde
  - Total cobrado (existente)
- **Botón "💰 Registrar pago a cuenta"** junto al botón "Cobrar todo".
- Modal simple: campo monto + nota opcional.
- **Historial de pagos a cuenta** — sección colapsable debajo de la tabla de fiados individuales. Muestra fecha, monto y nota de cada pago a cuenta. Admin puede eliminar entradas del historial.

### Permisos

- **Ambos roles**: registrar pagos a cuenta.
- **Admin**: eliminar pagos a cuenta del historial.

---

## Feature 4: Botones Siempre Visibles

### Objetivo

Eliminar el patrón `opacity-0 group-hover:opacity-100` en todas las tablas y listas de la app. Los botones de acción (editar, eliminar, cobrar, etc.) quedan siempre visibles con color de fondo suave.

### Alcance

Aplica a todas las páginas que tienen tablas con acciones por fila:
- `Movimientos.jsx`
- `Fiados.jsx` (lista de fiados + lista de instituciones en el modal)
- `Categorias.jsx`
- `Usuarios.jsx`
- `Productos.jsx`
- `TrabajosColegio.jsx`
- `TrabajosAnillado.jsx`
- `GastosMes.jsx` (nueva página — ya debe implementarse con este patrón desde el inicio)

### Cambio de patrón

**Antes:**
```jsx
<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
  <button className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg">
    <Pencil size={14} />
  </button>
</div>
```

**Después:**
```jsx
<div className="flex items-center gap-1">
  <button className="p-1.5 text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors">
    <Pencil size={14} />
  </button>
</div>
```

### Convención de colores por acción

| Acción | Color de fondo | Color de ícono |
|---|---|---|
| Editar / Modificar | `bg-primary-50` | `text-primary-600` |
| Eliminar | `bg-danger-50` | `text-danger-600` |
| Cobrar / Pagar | `bg-success-50` | `text-success-600` |
| Pago parcial | `bg-amber-50` | `text-amber-600` |
| Revertir | `bg-amber-50` | `text-amber-600` |

---

## Arquitectura general

### Archivos nuevos

```
src/
  context/  PrivacyContext.jsx
  pages/    GastosMes.jsx
```

### Archivos modificados

```
src/
  utils/        currency.js           — agregar formatAmount()
  context/      DataContext.jsx        — gastosFijos, gastosMes, pagosCuenta + CRUD
  utils/        db.js                 — mappers + queries para 3 nuevas tablas
  components/
    layout/     Header.jsx            — botón ocultar números
    layout/     Sidebar.jsx           — ítem "Gastos"
  App.jsx                             — ruta /gastos + PrivacyProvider
  pages/        Fiados.jsx            — KPIs ampliados + pago a cuenta
  pages/        Movimientos.jsx       — botones visibles + formatAmount
  pages/        Categorias.jsx        — botones visibles
  pages/        Usuarios.jsx          — botones visibles
  pages/        Productos.jsx         — botones visibles
  pages/        TrabajosColegio.jsx   — botones visibles
  pages/        TrabajosAnillado.jsx  — botones visibles
  pages/        Analytics.jsx         — formatAmount
  pages/        Dashboard.jsx         — formatAmount
  components/   KPICard.jsx           — formatAmount
```

### Realtime subscriptions

Las 3 tablas nuevas deben agregarse al canal de realtime en `DataContext.jsx`:

```js
.on('postgres_changes', { event: '*', schema: 'public', table: 'gastos_fijos' }, refreshGastosFijos)
.on('postgres_changes', { event: '*', schema: 'public', table: 'gastos_mes' }, refreshGastosMes)
.on('postgres_changes', { event: '*', schema: 'public', table: 'pagos_cuenta' }, refreshPagosCuenta)
```

### Supabase — tablas a crear

```sql
-- Ejecutar en Supabase SQL editor

CREATE TABLE gastos_fijos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  monto_estimado numeric DEFAULT 0,
  activo boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

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

CREATE TABLE pagos_cuenta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id uuid NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  monto numeric NOT NULL,
  nota text,
  created_by uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
```

---

## Fuera de scope

- Reportes o exports de gastos del mes (posible feature futura).
- Notificaciones de gastos vencidos.
- Gastos del mes en Analytics (posible feature futura).
- El botón de ocultar números afecta solo la UI — no modifica datos en Supabase.
