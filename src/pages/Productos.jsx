import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Package, Plus, Search, Pencil, Trash2, X, Tag, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useData } from '../context/DataContext'
import { db } from '../utils/db'
import { formatARS } from '../utils/currency'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'

const PAGE_SIZE = 60

const CATEGORIES = [
  'Fotocopias', 'Impresiones', 'Encuadernado', 'Plastificado', 'Escaneo',
  'Escritura', 'Cuadernos', 'Carpetas', 'Arte', 'Insumos Oficina',
  'Útiles', 'Mochilas y Cartucheras', 'Papelería', 'Embalaje',
  'Electrónica', 'Máquinas', 'Manualidades', 'Decoración', 'Otros',
]

const EMPTY_FORM = { name: '', price: '', category: 'Fotocopias', description: '', active: true }

function ProductoModal({ isOpen, onClose, initial, onSave, saving }) {
  const [form, setForm] = useState(initial || EMPTY_FORM)

  useEffect(() => { setForm(initial || EMPTY_FORM) }, [initial, isOpen])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim() || form.price === '') return
    onSave({ ...form, price: parseFloat(form.price) || 0 })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? 'Editar producto' : 'Nuevo producto'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre *</label>
          <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ej: Fotocopia A4 simple" required autoFocus />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Precio de venta (ARS) *</label>
          <Input type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoría</label>
          <select value={form.category} onChange={e => set('category', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción (opcional)</label>
          <Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Detalle adicional del producto" />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <input id="active-toggle" type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
          <label htmlFor="active-toggle" className="text-sm text-gray-700">Producto activo</label>
        </div>
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={saving}>
            {saving ? 'Guardando...' : initial ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Productos() {
  const { createProducto, updateProducto, deleteProducto, pedidoActivos, addToPedido, removeFromPedido } = useData()
  const { isAdmin } = useAuth()
  const { addToast } = useToast()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [catFilter, setCatFilter] = useState('Todos')
  const [showInactive, setShowInactive] = useState(false)
  const [page, setPage] = useState(0)

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState([])

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [pedidoLoadingId, setPedidoLoadingId] = useState(null)

  const debounceRef = useRef(null)

  // Debounce del search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  // Reset page cuando cambia filtro
  useEffect(() => { setPage(0) }, [catFilter, showInactive])

  // Cargar categorías al montar
  useEffect(() => {
    db.productos.getCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  // Búsqueda en servidor
  const fetchProductos = useCallback(async () => {
    setLoading(true)
    try {
      const result = await db.productos.search({
        query: debouncedSearch,
        category: catFilter,
        showInactive,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      })
      setItems(result.items)
      setTotal(result.total)
    } catch {
      addToast('Error al cargar productos', 'error')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, catFilter, showInactive, page]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchProductos() }, [fetchProductos])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const openCreate = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (p) => { setEditing({ ...p, price: String(p.price) }); setModalOpen(true) }

  const handleSave = async (data) => {
    try {
      setSaving(true)
      if (editing) {
        await updateProducto(editing.id, data)
        addToast('Producto actualizado', 'success')
      } else {
        await createProducto(data)
        addToast('Producto creado', 'success')
      }
      setModalOpen(false)
      fetchProductos()
      db.productos.getCategories().then(setCategories).catch(() => {})
    } catch {
      addToast('Error al guardar el producto', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      setDeletingId(id)
      await deleteProducto(id)
      addToast('Producto eliminado', 'success')
      fetchProductos()
    } catch {
      addToast('Error al eliminar', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const isInPedido = (productoId) => pedidoActivos.some(p => p.productoId === productoId)

  const handleTogglePedido = async (p) => {
    setPedidoLoadingId(p.id)
    try {
      if (isInPedido(p.id)) {
        const item = pedidoActivos.find(i => i.productoId === p.id)
        await removeFromPedido(item.id)
      } else {
        await addToPedido(p.id)
      }
    } catch {
      addToast('Error al actualizar el pedido', 'error')
    } finally {
      setPedidoLoadingId(null)
    }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total > 0 ? `${total.toLocaleString('es-AR')} productos` : 'Lista de precios'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus size={16} />
            Nuevo producto
          </Button>
        )}
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre..."
          className="w-full pl-10 pr-10 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white shadow-sm"
          autoFocus
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex flex-wrap gap-1">
          {['Todos', ...categories].map(cat => (
            <button
              key={cat}
              onClick={() => setCatFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                catFilter === cat
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        {isAdmin && (
          <label className="flex items-center gap-1.5 text-sm text-gray-500 cursor-pointer ml-auto select-none">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            Ver inactivos
          </label>
        )}
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="py-16 text-center text-gray-400">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Buscando...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <Package size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">
            {total === 0 && !debouncedSearch && catFilter === 'Todos'
              ? 'No hay productos cargados'
              : `Sin resultados${debouncedSearch ? ` para "${debouncedSearch}"` : ''}`}
          </p>
          {(debouncedSearch || catFilter !== 'Todos') && (
            <button onClick={() => { setSearch(''); setCatFilter('Todos') }} className="text-sm text-primary-600 hover:underline mt-1">
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {items.map(p => (
              <div
                key={p.id}
                className={`bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-2 transition-all ${
                  !p.active ? 'opacity-50 border-dashed border-gray-300' : 'border-gray-200 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-snug text-gray-800 flex-1">{p.name}</p>
                  {!p.active && <span className="shrink-0 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">inactivo</span>}
                </div>

                <div className="flex items-center gap-1.5">
                  <Tag size={11} className="text-gray-300" />
                  <span className="text-xs text-gray-400">{p.category}</span>
                </div>

                {p.description && <p className="text-xs text-gray-400 leading-snug">{p.description}</p>}

                <p className={`text-xl font-bold tabular-nums mt-auto pt-1 ${p.active ? 'text-primary-600' : 'text-gray-400'}`}>
                  {formatARS(p.price)}
                </p>

                <div className="pt-1 border-t border-gray-100 mt-1 space-y-1">
                  <button
                    onClick={() => handleTogglePedido(p)}
                    disabled={pedidoLoadingId === p.id}
                    className={`w-full flex items-center justify-center gap-1 py-1.5 text-xs rounded-lg transition-colors font-medium ${
                      isInPedido(p.id)
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                    } disabled:opacity-40`}
                  >
                    <ClipboardList size={13} />
                    {pedidoLoadingId === p.id ? '...' : isInPedido(p.id) ? '✓ En pedido' : 'Al pedido'}
                  </button>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(p)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
                      >
                        <Pencil size={13} />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        disabled={deletingId === p.id}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs bg-danger-50 text-danger-600 hover:bg-danger-100 rounded-lg transition-colors disabled:opacity-40"
                      >
                        <Trash2 size={13} />
                        {deletingId === p.id ? '...' : 'Eliminar'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-500">
                Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total.toLocaleString('es-AR')}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-3 py-1.5 text-sm text-gray-700 font-medium">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <ProductoModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={editing}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  )
}
