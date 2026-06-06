import { supabase } from '../lib/supabase'

// --- Mappers: DB snake_case → app camelCase ---

function mapUser(u) {
  return { id: u.id, name: u.name, email: u.email, password: u.password, role: u.role, createdAt: u.created_at }
}

function mapCategory(c) {
  return { id: c.id, type: c.type, name: c.name, active: c.active, sortOrder: c.sort_order, createdAt: c.created_at }
}

function mapMovement(m) {
  return { id: m.id, type: m.type, amount: Number(m.amount), paymentMethod: m.payment_method, categoryId: m.category_id, note: m.note, createdAt: m.created_at, createdBy: m.created_by }
}

function mapInstitucion(i) {
  return { id: i.id, name: i.name, description: i.description, color: i.color, active: i.active, createdAt: i.created_at }
}

function mapFiado(f) {
  return { id: f.id, institucionId: f.institucion_id, description: f.description, amount: Number(f.amount), amountPaid: Number(f.amount_paid || 0), paid: f.paid, paidAt: f.paid_at, note: f.note, createdAt: f.created_at, createdBy: f.created_by }
}

function mapProducto(p) {
  return {
    id: p.id,
    name: p.name,
    price: Number(p.price),
    category: p.category,
    description: p.description,
    active: p.active,
    sortOrder: p.sort_order,
    createdAt: p.created_at,
    barcode: p.barcode || null,
  }
}

function mapTrabajoColegio(t) {
  return {
    id: t.id,
    escuela: t.escuela,
    grado: t.grado,
    materia: t.materia,
    profesor: t.profesor,
    descripcion: t.descripcion,
    cantidadCopias: t.cantidad_copias,
    cantidadAlumnos: t.cantidad_alumnos,
    precioPorCopia: Number(t.precio_por_copia),
    estado: t.estado,
    fechaIngreso: t.fecha_ingreso,
    createdAt: t.created_at,
    createdBy: t.created_by,
  }
}

function mapTrabajoAnillado(t) {
  return {
    id: t.id,
    cliente: t.cliente,
    telefono: t.telefono,
    descripcion: t.descripcion,
    cantidad: t.cantidad,
    tipoAnillado: t.tipo_anillado,
    fechaEntrega: t.fecha_entrega,
    precio: t.precio !== null && t.precio !== undefined ? Number(t.precio) : null,
    estado: t.estado,
    notas: t.notas,
    createdAt: t.created_at,
    createdBy: t.created_by,
  }
}

function mapCierre(c) {
  return {
    id: c.id,
    fecha: c.fecha,
    ingresos: Number(c.ingresos),
    egresos: Number(c.egresos),
    resultado: Number(c.resultado),
    cash: Number(c.cash),
    qr: Number(c.qr),
    card: Number(c.card),
    total: Number(c.total),
    nota: c.nota,
    cerradoPor: c.cerrado_por,
    createdAt: c.created_at,
  }
}

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

function mapPedidoItem(p) {
  return {
    id: p.id,
    productoId: p.producto_id,
    estado: p.estado,
    fechaPedido: p.fecha_pedido,
    createdAt: p.created_at,
    nombre: p.productos?.name || '',
    categoria: p.productos?.category || '',
  }
}

// --- DB API ---

export const db = {
  users: {
    getAll: async () => {
      const { data, error } = await supabase.from('usuarios').select('*').order('created_at', { ascending: true })
      if (error) throw error
      return data.map(mapUser)
    },
    getById: async (id) => {
      const { data, error } = await supabase.from('usuarios').select('*').eq('id', id).single()
      if (error) return null
      return mapUser(data)
    },
    findByEmail: async (email) => {
      const { data, error } = await supabase.from('usuarios').select('*').ilike('email', email).single()
      if (error) return null
      return mapUser(data)
    },
    create: async (data) => {
      const { data: row, error } = await supabase.from('usuarios').insert({ name: data.name, email: data.email, password: data.password, role: data.role }).select().single()
      if (error) throw error
      return mapUser(row)
    },
    update: async (id, data) => {
      const patch = {}
      if (data.name !== undefined) patch.name = data.name
      if (data.email !== undefined) patch.email = data.email
      if (data.password !== undefined) patch.password = data.password
      if (data.role !== undefined) patch.role = data.role
      const { data: row, error } = await supabase.from('usuarios').update(patch).eq('id', id).select().single()
      if (error) throw error
      return mapUser(row)
    },
    delete: async (id) => {
      const { error } = await supabase.from('usuarios').delete().eq('id', id)
      if (error) throw error
    },
  },

  categories: {
    getAll: async () => {
      const { data, error } = await supabase.from('categorias').select('*').order('sort_order', { ascending: true })
      if (error) throw error
      return data.map(mapCategory)
    },
    getById: async (id) => {
      const { data, error } = await supabase.from('categorias').select('*').eq('id', id).single()
      if (error) return null
      return mapCategory(data)
    },
    create: async (data) => {
      const { data: maxRow } = await supabase.from('categorias').select('sort_order').order('sort_order', { ascending: false }).limit(1).single()
      const nextSort = (maxRow?.sort_order ?? 0) + 1
      const { data: row, error } = await supabase.from('categorias').insert({ type: data.type, name: data.name, active: data.active ?? true, sort_order: nextSort }).select().single()
      if (error) throw error
      return mapCategory(row)
    },
    update: async (id, data) => {
      const patch = {}
      if (data.type !== undefined) patch.type = data.type
      if (data.name !== undefined) patch.name = data.name
      if (data.active !== undefined) patch.active = data.active
      if (data.sortOrder !== undefined) patch.sort_order = data.sortOrder
      const { data: row, error } = await supabase.from('categorias').update(patch).eq('id', id).select().single()
      if (error) throw error
      return mapCategory(row)
    },
    delete: async (id) => {
      const { error } = await supabase.from('categorias').delete().eq('id', id)
      if (error) throw error
    },
  },

  movements: {
    getAll: async () => {
      const { data, error } = await supabase.from('movimientos').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data.map(mapMovement)
    },
    getById: async (id) => {
      const { data, error } = await supabase.from('movimientos').select('*').eq('id', id).single()
      if (error) return null
      return mapMovement(data)
    },
    create: async (data) => {
      const { data: row, error } = await supabase.from('movimientos').insert({ type: data.type, amount: data.amount, payment_method: data.paymentMethod, category_id: data.categoryId, note: data.note || null, created_by: data.createdBy }).select().single()
      if (error) throw error
      return mapMovement(row)
    },
    update: async (id, data) => {
      const patch = {}
      if (data.type !== undefined) patch.type = data.type
      if (data.amount !== undefined) patch.amount = data.amount
      if (data.paymentMethod !== undefined) patch.payment_method = data.paymentMethod
      if (data.categoryId !== undefined) patch.category_id = data.categoryId
      if (data.note !== undefined) patch.note = data.note || null
      const { data: row, error } = await supabase.from('movimientos').update(patch).eq('id', id).select().single()
      if (error) throw error
      return mapMovement(row)
    },
    delete: async (id) => {
      const { error } = await supabase.from('movimientos').delete().eq('id', id)
      if (error) throw error
    },
  },

  instituciones: {
    getAll: async () => {
      const { data, error } = await supabase.from('instituciones').select('*').order('created_at', { ascending: true })
      if (error) throw error
      return data.map(mapInstitucion)
    },
    create: async (data) => {
      const { data: row, error } = await supabase.from('instituciones').insert({ name: data.name, description: data.description || null, color: data.color || '#2563EB', active: data.active ?? true }).select().single()
      if (error) throw error
      return mapInstitucion(row)
    },
    update: async (id, data) => {
      const patch = {}
      if (data.name !== undefined) patch.name = data.name
      if (data.description !== undefined) patch.description = data.description || null
      if (data.color !== undefined) patch.color = data.color
      if (data.active !== undefined) patch.active = data.active
      const { data: row, error } = await supabase.from('instituciones').update(patch).eq('id', id).select().single()
      if (error) throw error
      return mapInstitucion(row)
    },
    delete: async (id) => {
      const { error } = await supabase.from('instituciones').delete().eq('id', id)
      if (error) throw error
    },
  },

  fiados: {
    getAll: async () => {
      const { data, error } = await supabase.from('fiados').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data.map(mapFiado)
    },
    create: async (data) => {
      const { data: row, error } = await supabase.from('fiados').insert({ institucion_id: data.institucionId, description: data.description, amount: data.amount, paid: false, note: data.note || null, created_by: data.createdBy }).select().single()
      if (error) throw error
      return mapFiado(row)
    },
    update: async (id, data) => {
      const patch = {}
      if (data.description !== undefined) patch.description = data.description
      if (data.amount !== undefined) patch.amount = data.amount
      if (data.note !== undefined) patch.note = data.note || null
      if (data.institucionId !== undefined) patch.institucion_id = data.institucionId
      if (data.amountPaid !== undefined) patch.amount_paid = data.amountPaid
      if (data.paid !== undefined) {
        patch.paid = data.paid
        patch.paid_at = data.paid ? new Date().toISOString() : null
      }
      const { data: row, error } = await supabase.from('fiados').update(patch).eq('id', id).select().single()
      if (error) throw error
      return mapFiado(row)
    },
    delete: async (id) => {
      const { error } = await supabase.from('fiados').delete().eq('id', id)
      if (error) throw error
    },
    markAllPaid: async (institucionId) => {
      const { error } = await supabase
        .from('fiados')
        .update({ paid: true, paid_at: new Date().toISOString() })
        .eq('institucion_id', institucionId)
        .eq('paid', false)
      if (error) throw error
    },
  },

  config: {
    get: async () => {
      const { data, error } = await supabase.from('configuracion').select('*').eq('id', 1).single()
      if (error || !data) return { cycleStart: null }
      return { cycleStart: data.cycle_start || null }
    },
    update: async (patch) => {
      const row = { id: 1, updated_at: new Date().toISOString() }
      if ('cycleStart' in patch) row.cycle_start = patch.cycleStart || null
      const { error } = await supabase.from('configuracion').upsert(row)
      if (error) throw error
    },
  },

  productos: {
    getAll: async () => {
      const { data, error } = await supabase.from('productos').select('*').order('sort_order', { ascending: true }).order('name', { ascending: true })
      if (error) throw error
      return data.map(mapProducto)
    },
    search: async ({ query, category, showInactive, limit = 50, offset = 0 }) => {
      let q = supabase.from('productos').select('*', { count: 'exact' })
      if (!showInactive) q = q.eq('active', true)
      if (category && category !== 'Todos') q = q.eq('category', category)
      if (query && query.trim()) q = q.or(`name.ilike.%${query.trim()}%,barcode.ilike.%${query.trim()}%`)
      q = q.order('name', { ascending: true }).range(offset, offset + limit - 1)
      const { data, error, count } = await q
      if (error) throw error
      return { items: data.map(mapProducto), total: count }
    },
    getCategories: async () => {
      const { data, error } = await supabase.from('productos').select('category').eq('active', true)
      if (error) throw error
      return [...new Set(data.map(d => d.category))].sort()
    },
    create: async (data) => {
      const { data: maxRow } = await supabase.from('productos').select('sort_order').order('sort_order', { ascending: false }).limit(1).single()
      const nextSort = (maxRow?.sort_order ?? 0) + 1
      const { data: row, error } = await supabase.from('productos').insert({ name: data.name, price: data.price, category: data.category, description: data.description || null, active: data.active ?? true, sort_order: nextSort }).select().single()
      if (error) throw error
      return mapProducto(row)
    },
    update: async (id, data) => {
      const patch = {}
      if (data.name !== undefined) patch.name = data.name
      if (data.price !== undefined) patch.price = data.price
      if (data.category !== undefined) patch.category = data.category
      if (data.description !== undefined) patch.description = data.description || null
      if (data.active !== undefined) patch.active = data.active
      const { data: row, error } = await supabase.from('productos').update(patch).eq('id', id).select().single()
      if (error) throw error
      return mapProducto(row)
    },
    delete: async (id) => {
      const { error } = await supabase.from('productos').delete().eq('id', id)
      if (error) throw error
    },
  },

  trabajosColegio: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('trabajos_colegio')
        .select('*')
        .order('escuela', { ascending: true })
        .order('grado', { ascending: true })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data.map(mapTrabajoColegio)
    },
    create: async (data) => {
      const { data: row, error } = await supabase
        .from('trabajos_colegio')
        .insert({
          escuela: data.escuela,
          grado: data.grado,
          materia: data.materia,
          profesor: data.profesor || null,
          descripcion: data.descripcion || null,
          cantidad_copias: data.cantidadCopias,
          cantidad_alumnos: data.cantidadAlumnos || null,
          precio_por_copia: data.precioPorCopia || 0,
          estado: data.estado || 'pendiente',
          fecha_ingreso: data.fechaIngreso,
          created_by: data.createdBy,
        })
        .select()
        .single()
      if (error) throw error
      return mapTrabajoColegio(row)
    },
    update: async (id, data) => {
      const patch = {}
      if (data.escuela !== undefined) patch.escuela = data.escuela
      if (data.grado !== undefined) patch.grado = data.grado
      if (data.materia !== undefined) patch.materia = data.materia
      if (data.profesor !== undefined) patch.profesor = data.profesor || null
      if (data.descripcion !== undefined) patch.descripcion = data.descripcion || null
      if (data.cantidadCopias !== undefined) patch.cantidad_copias = data.cantidadCopias
      if (data.cantidadAlumnos !== undefined) patch.cantidad_alumnos = data.cantidadAlumnos || null
      if (data.precioPorCopia !== undefined) patch.precio_por_copia = data.precioPorCopia
      if (data.estado !== undefined) patch.estado = data.estado
      if (data.fechaIngreso !== undefined) patch.fecha_ingreso = data.fechaIngreso
      const { data: row, error } = await supabase
        .from('trabajos_colegio')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return mapTrabajoColegio(row)
    },
    delete: async (id) => {
      const { error } = await supabase.from('trabajos_colegio').delete().eq('id', id)
      if (error) throw error
    },
  },

  archivosColegioStorage: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('archivos_colegio')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data.map(f => ({
        id: f.id,
        trabajoId: f.trabajo_id,
        nombre: f.nombre,
        path: f.path,
        size: f.size,
        uploadedBy: f.uploaded_by,
        createdAt: f.created_at,
        url: supabase.storage.from('archivos-colegio').getPublicUrl(f.path).data.publicUrl,
      }))
    },
    upload: async (trabajoId, file, uploadedBy) => {
      const safeName = file.name.replace(/[^a-zA-Z0-9._()-]/g, '_')
      const path = `${trabajoId}/${Date.now()}_${safeName}`
      const { error: storageError } = await supabase.storage
        .from('archivos-colegio')
        .upload(path, file, { contentType: file.type })
      if (storageError) throw storageError
      const { data: { publicUrl } } = supabase.storage.from('archivos-colegio').getPublicUrl(path)
      const { data: row, error: dbError } = await supabase
        .from('archivos_colegio')
        .insert({ trabajo_id: trabajoId, nombre: file.name, path, size: file.size, uploaded_by: uploadedBy })
        .select()
        .single()
      if (dbError) throw dbError
      return { id: row.id, trabajoId: row.trabajo_id, nombre: row.nombre, path: row.path, size: row.size, createdAt: row.created_at, url: publicUrl }
    },
    delete: async (fileId, path) => {
      await supabase.storage.from('archivos-colegio').remove([path])
      const { error } = await supabase.from('archivos_colegio').delete().eq('id', fileId)
      if (error) throw error
    },
  },

  archivosAnilladoStorage: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('archivos_anillado')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data.map(f => ({
        id: f.id,
        trabajoId: f.trabajo_id,
        nombre: f.nombre,
        path: f.path,
        size: f.size,
        uploadedBy: f.uploaded_by,
        createdAt: f.created_at,
        url: supabase.storage.from('archivos-anillado').getPublicUrl(f.path).data.publicUrl,
      }))
    },
    upload: async (trabajoId, file, uploadedBy) => {
      const safeName = file.name.replace(/[^a-zA-Z0-9._()-]/g, '_')
      const path = `${trabajoId}/${Date.now()}_${safeName}`
      const { error: storageError } = await supabase.storage
        .from('archivos-anillado')
        .upload(path, file, { contentType: file.type })
      if (storageError) throw storageError
      const { data: { publicUrl } } = supabase.storage.from('archivos-anillado').getPublicUrl(path)
      const { data: row, error: dbError } = await supabase
        .from('archivos_anillado')
        .insert({ trabajo_id: trabajoId, nombre: file.name, path, size: file.size, uploaded_by: uploadedBy })
        .select()
        .single()
      if (dbError) throw dbError
      return { id: row.id, trabajoId: row.trabajo_id, nombre: row.nombre, path: row.path, size: row.size, createdAt: row.created_at, url: publicUrl }
    },
    delete: async (fileId, path) => {
      await supabase.storage.from('archivos-anillado').remove([path])
      const { error } = await supabase.from('archivos_anillado').delete().eq('id', fileId)
      if (error) throw error
    },
  },

  trabajosAnillado: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('trabajos_anillado')
        .select('*')
        .order('fecha_entrega', { ascending: true })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data.map(mapTrabajoAnillado)
    },
    create: async (data) => {
      const { data: row, error } = await supabase
        .from('trabajos_anillado')
        .insert({
          cliente: data.cliente,
          telefono: data.telefono || null,
          descripcion: data.descripcion,
          cantidad: data.cantidad,
          tipo_anillado: data.tipoAnillado,
          fecha_entrega: data.fechaEntrega,
          precio: data.precio || null,
          estado: data.estado || 'pendiente',
          notas: data.notas || null,
          created_by: data.createdBy,
        })
        .select()
        .single()
      if (error) throw error
      return mapTrabajoAnillado(row)
    },
    update: async (id, data) => {
      const patch = {}
      if (data.cliente !== undefined) patch.cliente = data.cliente
      if (data.telefono !== undefined) patch.telefono = data.telefono || null
      if (data.descripcion !== undefined) patch.descripcion = data.descripcion
      if (data.cantidad !== undefined) patch.cantidad = data.cantidad
      if (data.tipoAnillado !== undefined) patch.tipo_anillado = data.tipoAnillado
      if (data.fechaEntrega !== undefined) patch.fecha_entrega = data.fechaEntrega
      if (data.precio !== undefined) patch.precio = data.precio || null
      if (data.estado !== undefined) patch.estado = data.estado
      if (data.notas !== undefined) patch.notas = data.notas || null
      const { data: row, error } = await supabase
        .from('trabajos_anillado')
        .update(patch)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return mapTrabajoAnillado(row)
    },
    delete: async (id) => {
      const { error } = await supabase.from('trabajos_anillado').delete().eq('id', id)
      if (error) throw error
    },
  },

  cierres: {
    getAll: async () => {
      const { data, error } = await supabase.from('cierres_caja').select('*').order('fecha', { ascending: false })
      if (error) throw error
      return data.map(mapCierre)
    },
    create: async (data) => {
      const { data: row, error } = await supabase.from('cierres_caja').insert({
        fecha: data.fecha,
        ingresos: data.ingresos,
        egresos: data.egresos,
        resultado: data.resultado,
        cash: data.cash,
        qr: data.qr,
        card: data.card,
        total: data.total,
        nota: data.nota || null,
        cerrado_por: data.cerradoPor,
      }).select().single()
      if (error) throw error
      return mapCierre(row)
    },
    delete: async (id) => {
      const { error } = await supabase.from('cierres_caja').delete().eq('id', id)
      if (error) throw error
    },
  },

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

  pedidos: {
    getActivos: async () => {
      const { data, error } = await supabase
        .from('pedido_items')
        .select('*, productos(name, category)')
        .eq('estado', 'pendiente')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data.map(mapPedidoItem)
    },
    getHistorial: async () => {
      const { data, error } = await supabase
        .from('pedido_items')
        .select('*, productos(name, category)')
        .eq('estado', 'pedido')
        .order('fecha_pedido', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data.map(mapPedidoItem)
    },
    add: async (productoId) => {
      const { error } = await supabase
        .from('pedido_items')
        .insert({ producto_id: productoId })
      if (error && error.code === '23505') return  // ya está en la lista activa
      if (error) throw error
    },
    remove: async (id) => {
      const { error } = await supabase.from('pedido_items').delete().eq('id', id)
      if (error) throw error
    },
    cerrarPedido: async (ids) => {
      if (!ids.length) return
      const today = new Date().toISOString().split('T')[0]
      const { error } = await supabase
        .from('pedido_items')
        .update({ estado: 'pedido', fecha_pedido: today })
        .in('id', ids)
      if (error) throw error
    },
  },
}
