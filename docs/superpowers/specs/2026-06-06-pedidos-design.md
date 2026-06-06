# Spec: Lista de Pedidos

**Fecha:** 2026-06-06

## Resumen

Nueva sección del sistema para armar y gestionar listas de productos a pedir al proveedor. Permite a cualquier usuario agregar productos que faltan, tildarlos cuando se hacen el pedido grande, y archivarlos con historial.

---

## Decisiones de diseño

| Decisión | Elección |
|---|---|
| Dónde vive | Página separada `/pedidos` en el sidebar + botón en tarjetas de Productos |
| Cantidades | No (solo qué productos, sin número) |
| Acceso | Ambos roles (admin y empleado) |
| Persistencia | Supabase |
| Al completar | Marcar items como pedidos → archivar con fecha → historial |
| Búsqueda | Por nombre Y por código de barras |

---

## Base de datos

### Tabla nueva: `pedido_items`

```sql
create table pedido_items (
  id          uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos(id) on delete cascade,
  estado      text not null default 'pendiente', -- 'pendiente' | 'pedido'
  fecha_pedido date,          -- se rellena cuando se archiva el pedido
  created_at  timestamptz default now()
);
```

- Un producto no puede estar dos veces en estado `pendiente` (constraint único: `producto_id` WHERE `estado = 'pendiente'`).
- Cuando se hace "Cerrar pedido": solo los items que el usuario tildó (checked) pasan a `pedido` con `fecha_pedido = today()`. Los no-tildados quedan en `pendiente` para el próximo pedido.
- No hay eliminación física en el historial; solo la lista activa puede borrar items.

---

## Arquitectura

### Cambios en `db.js`

Nuevo namespace `db.pedidos` con:
- `getActivos()` → items con `estado = 'pendiente'`, join con `productos`
- `getHistorial()` → items con `estado = 'pedido'`, agrupados por `fecha_pedido` en el cliente
- `add(productoId)` → insert; falla silenciosamente si ya existe en activo
- `remove(id)` → delete
- `cerrarPedido(ids[])` → update de los ids tildados: `estado = 'pedido'`, `fecha_pedido = today()`. Los no-tildados quedan en `pendiente`.

### Cambios en `DataContext.jsx`

Agregar subscription realtime a `pedido_items` en el canal `db-changes` existente. Estado: `pedidoActivos` (array) + `refreshPedidos()`.

### Componentes nuevos

**`src/pages/Pedidos.jsx`** — página principal:
- Sección superior: lista activa con checkboxes, botón "✕" por item, botón "Cerrar pedido"
- Sección buscador: input que busca en `productos` por nombre o código de barras (`db.productos.search`)
- Sección inferior: historial agrupado por `fecha_pedido`, colapsable por pedido

**Cambio en `src/pages/Productos.jsx`**:
- Botón "Al pedido" en cada tarjeta (visible para ambos roles)
- Si el producto ya está en `pedidoActivos`, el botón cambia a "✓ En pedido" (azul relleno, deshabilitado)
- El estado de qué productos están en el pedido se lee de `DataContext`

### Routing y sidebar

- Nueva ruta `/pedidos` en `App.jsx`
- Nueva entrada en `Sidebar.jsx` con ícono `ClipboardList` de lucide-react

---

## Actualización de productos desde Excel

### Tarea de importación (script one-shot)

Antes de implementar la feature, ejecutar un script Python que:
1. Lee `Lista_de_Precios_ALE_Actualizada_con_venta.xlsx`
2. Extrae columnas: A (código), B (descripción), E (código de barras), H (precio +100%)
3. Elimina todos los productos existentes en Supabase (`DELETE FROM productos`)
4. Inserta los ~8865 productos nuevos en batches de 500 con `category = 'Otros'` (el Excel no tiene categorías; se puede reclasificar desde la app después si se necesita)

**Columna de precio a usar:** H (`Precio +100%`) = precio de venta al público.

### Cambio en tabla `productos`

Agregar columna `barcode text` para almacenar el código de barras del Excel, usada en la búsqueda de pedidos.

### Búsqueda por código de barras

`db.productos.search()` ya recibe `query`; extender el filtro en Supabase para que busque también en `barcode` (columna nueva):
```sql
.or(`name.ilike.%${query}%,barcode.ilike.%${query}%`)
```

---

## Flujo de usuario

1. Usuario ve que falta un producto → va a Productos, hace click en "Al pedido"
   *o* va directo a /pedidos, busca el producto y hace "+ Agregar"
2. El item aparece en la lista activa de /pedidos (realtime para todos los usuarios)
3. Cuando llega el pedido grande: van a /pedidos, tildan lo que ya pidieron
4. Al terminar: "Cerrar pedido" → todos los items tildados se archivan con la fecha de hoy
5. La lista activa queda vacía. En el historial aparece el nuevo pedido con su fecha.

---

## Lo que NO entra en este spec

- Cantidades por producto
- Notificaciones / alertas de stock
- Integración con proveedores
- Exportar la lista a PDF/CSV (puede venir después)
