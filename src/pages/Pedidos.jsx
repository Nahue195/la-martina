import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { db } from '../utils/db'

export default function Pedidos() {
  const { pedidoActivos, addToPedido, removeFromPedido, cerrarPedido } = useData()
  const { addToast } = useToast()

  const [checked, setChecked] = useState(new Set())
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [historial, setHistorial] = useState([])
  const [historialOpen, setHistorialOpen] = useState(new Set())
  const [searching, setSearching] = useState(false)
  const [closing, setClosing] = useState(false)

  const debounceRef = useRef(null)

  const fetchHistorial = useCallback(async () => {
    try {
      const items = await db.pedidos.getHistorial()
      const grouped = {}
      for (const item of items) {
        if (!grouped[item.fechaPedido]) grouped[item.fechaPedido] = []
        grouped[item.fechaPedido].push(item)
      }
      setHistorial(Object.entries(grouped).map(([fecha, items]) => ({ fecha, items })))
    } catch {
      setHistorial([])
    }
  }, [])

  useEffect(() => { fetchHistorial() }, [fetchHistorial])

  useEffect(() => {
    fetchHistorial()
  }, [pedidoActivos.length, fetchHistorial])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!search.trim()) { setSearchResults([]); setSearching(false); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const { items } = await db.productos.search({
          query: search, category: 'Todos', showInactive: false, limit: 10, offset: 0,
        })
        setSearchResults(items)
      } catch { setSearchResults([]) }
      finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  const toggleCheck = (id) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleRemove = async (id) => {
    try {
      await removeFromPedido(id)
      setChecked(prev => { const next = new Set(prev); next.delete(id); return next })
    } catch {
      addToast('Error al quitar el producto', 'error')
    }
  }

  const handleCerrar = async () => {
    const ids = [...checked]
    if (!ids.length) return
    setClosing(true)
    try {
      await cerrarPedido(ids)
      setChecked(new Set())
      await fetchHistorial()
      addToast('Pedido archivado correctamente', 'success')
    } catch {
      addToast('Error al archivar el pedido', 'error')
    } finally {
      setClosing(false)
    }
  }

  const handleAdd = async (producto) => {
    try {
      await addToPedido(producto.id)
      setSearch('')
      setSearchResults([])
      addToast(`${producto.name} agregado al pedido`, 'success')
    } catch {
      addToast('Error al agregar el producto', 'error')
    }
  }

  const toggleHistorial = (fecha) => {
    setHistorialOpen(prev => {
      const next = new Set(prev)
      if (next.has(fecha)) next.delete(fecha)
      else next.add(fecha)
      return next
    })
  }

  const activeProductIds = new Set(pedidoActivos.map(p => p.productoId))

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {pedidoActivos.length > 0
            ? `${pedidoActivos.length} producto${pedidoActivos.length !== 1 ? 's' : ''} en la lista activa`
            : 'Lista de pedidos vacía'}
        </p>
      </div>

      {/* Lista activa */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-blue-700">
            LISTA ACTIVA — {pedidoActivos.length} items
          </p>
          <button
            onClick={handleCerrar}
            disabled={checked.size === 0 || closing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <CheckCircle size={13} />
            {closing ? 'Archivando...' : `Cerrar pedido (${checked.size} tildado${checked.size !== 1 ? 's' : ''})`}
          </button>
        </div>

        {pedidoActivos.length === 0 ? (
          <p className="text-sm text-blue-400 text-center py-4">
            No hay productos en la lista. Buscá abajo para agregar.
          </p>
        ) : (
          <div className="space-y-1">
            {pedidoActivos.map(item => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-3 py-2 bg-white rounded-lg"
              >
                <input
                  type="checkbox"
                  checked={checked.has(item.id)}
                  onChange={() => toggleCheck(item.id)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 shrink-0"
                />
                <span className={`flex-1 text-sm font-medium ${checked.has(item.id) ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                  {item.nombre}
                </span>
                <span className="text-xs text-gray-400 shrink-0">{item.categoria}</span>
                <button
                  onClick={() => handleRemove(item.id)}
                  className="p-1 text-danger-500 hover:bg-danger-50 rounded transition-colors shrink-0"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Buscador */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
          Buscar y agregar
        </p>
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o código de barras..."
            className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            autoFocus
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setSearchResults([]) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {searching && (
          <p className="text-xs text-gray-400 text-center py-2">Buscando...</p>
        )}

        {!searching && searchResults.length > 0 && (
          <div className="space-y-1">
            {searchResults.map(p => {
              const inPedido = activeProductIds.has(p.id)
              return (
                <div key={p.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                  <div className="min-w-0 flex-1 mr-3">
                    <span className="text-sm font-medium text-gray-800">{p.name}</span>
                    {p.barcode && (
                      <span className="text-xs text-gray-400 ml-2">#{p.barcode}</span>
                    )}
                    <span className="text-xs text-gray-400 ml-2">{p.category}</span>
                  </div>
                  <button
                    onClick={() => !inPedido && handleAdd(p)}
                    disabled={inPedido}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                      inPedido
                        ? 'bg-primary-100 text-primary-600 cursor-default'
                        : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                    }`}
                  >
                    {inPedido ? '✓ En pedido' : '+ Agregar'}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {!searching && search.trim() && searchResults.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-2">
            Sin resultados para "{search}"
          </p>
        )}
      </div>

      {/* Historial */}
      {historial.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Historial</p>
          <div className="space-y-2">
            {historial.map(({ fecha, items }) => {
              const isOpen = historialOpen.has(fecha)
              const label = new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', {
                day: 'numeric', month: 'long', year: 'numeric',
              })
              return (
                <div key={fecha} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                    onClick={() => toggleHistorial(fecha)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700">Pedido del {label}</span>
                      <span className="text-xs text-gray-400">{items.length} producto{items.length !== 1 ? 's' : ''}</span>
                    </div>
                    {isOpen
                      ? <ChevronUp size={15} className="text-gray-400 shrink-0" />
                      : <ChevronDown size={15} className="text-gray-400 shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="px-4 py-2 divide-y divide-gray-50">
                      {items.map(item => (
                        <div key={item.id} className="flex justify-between py-2">
                          <span className="text-sm text-gray-700">{item.nombre}</span>
                          <span className="text-xs text-gray-400">{item.categoria}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
