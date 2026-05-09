import React, { useState, useMemo } from 'react'
import { Plus, Download, Search, Pencil, Trash2, Filter, Loader2 } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { formatDateTime } from '../utils/dateUtils'
import { formatARS, formatAmount } from '../utils/currency'
import { usePrivacy } from '../context/PrivacyContext'
import { exportMovementsToCSV } from '../utils/export'
import { minutesAgo } from '../utils/dateUtils'
import Badge, { PAYMENT_BADGE } from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Select from '../components/ui/Select'
import Input from '../components/ui/Input'
import MovementModal from '../components/MovementModal'
import Modal from '../components/ui/Modal'

const PAGE_SIZE = 50

export default function Movimientos() {
  const { movements, categories, users, deleteMovement } = useData()
  const { isAdmin, user } = useAuth()
  const { addToast } = useToast()
  const { hideNumbers } = usePrivacy()

  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [filters, setFilters] = useState({
    search: '',
    tipo: '',
    method: '',
    categoryId: '',
    userId: '',
    dateFrom: '',
    dateTo: '',
  })
  const [page, setPage] = useState(1)

  function setF(field) {
    return (e) => { setFilters((f) => ({ ...f, [field]: e.target.value })); setPage(1) }
  }

  function clearFilters() {
    setFilters({ search: '', tipo: '', method: '', categoryId: '', userId: '', dateFrom: '', dateTo: '' })
    setPage(1)
  }

  const filtered = useMemo(() => {
    return movements.filter((m) => {
      if (filters.tipo && m.type !== filters.tipo) return false
      if (filters.method && m.paymentMethod !== filters.method) return false
      if (filters.categoryId && m.categoryId !== filters.categoryId) return false
      if (filters.userId && m.createdBy !== filters.userId) return false
      if (filters.dateFrom && new Date(m.createdAt) < new Date(filters.dateFrom + 'T00:00:00')) return false
      if (filters.dateTo && new Date(m.createdAt) > new Date(filters.dateTo + 'T23:59:59')) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        const cat = categories.find((c) => c.id === m.categoryId)
        const u = users.find((u) => u.id === m.createdBy)
        const haystack = [cat?.name, u?.name, m.note, m.type].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [movements, filters, categories, users])

  const paginated = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = filtered.length > paginated.length

  function canEdit(m) {
    if (isAdmin) return true
    return m.createdBy === user.id && minutesAgo(m.createdAt) <= 10
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteMovement(deleteTarget.id)
      addToast('Movimiento eliminado', 'info')
    } catch {
      addToast('Error al eliminar. Revisá la conexión.', 'error')
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const hasActiveFilters = Object.values(filters).some(Boolean)

  const totals = useMemo(() => {
    const ing = filtered.filter((m) => m.type === 'Ingreso').reduce((s, m) => s + m.amount, 0)
    const eg = filtered.filter((m) => m.type === 'Egreso').reduce((s, m) => s + m.amount, 0)
    return { ing, eg, resultado: ing - eg }
  }, [filtered])

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Movimientos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} registros encontrados</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button variant="secondary" onClick={() => exportMovementsToCSV(filtered, categories, users)}>
              <Download size={15} />
              Exportar CSV
            </Button>
          )}
          <Button onClick={() => { setEditTarget(null); setModalOpen(true) }}>
            <Plus size={16} />
            Nuevo movimiento
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={15} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filtros</span>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs text-primary-600 hover:underline ml-auto">
              Limpiar filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-7 gap-3">
          <div className="col-span-2 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar..."
              value={filters.search}
              onChange={setF('search')}
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <Select value={filters.tipo} onChange={setF('tipo')}>
            <option value="">Tipo: Todos</option>
            <option value="Ingreso">Ingreso</option>
            <option value="Egreso">Egreso</option>
          </Select>
          <Select value={filters.method} onChange={setF('method')}>
            <option value="">Método: Todos</option>
            <option value="Cash">Efectivo</option>
            <option value="QRTransfer">QR/Transferencia</option>
            <option value="Card">Tarjeta</option>
          </Select>
          <Select value={filters.categoryId} onChange={setF('categoryId')}>
            <option value="">Categoría: Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
            ))}
          </Select>
          <Input type="date" value={filters.dateFrom} onChange={setF('dateFrom')} />
          <Input type="date" value={filters.dateTo} onChange={setF('dateTo')} />
        </div>
      </div>

      {/* Summary bar */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-6 bg-white rounded-xl border border-gray-200 px-5 py-3 shadow-sm text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Ingresos:</span>
            <span className="font-semibold text-success-700">{formatAmount(totals.ing, hideNumbers)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Egresos:</span>
            <span className="font-semibold text-danger-700">{formatAmount(totals.eg, hideNumbers)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Resultado:</span>
            <span className={`font-bold ${totals.resultado >= 0 ? 'text-success-700' : 'text-danger-700'}`}>
              {formatAmount(totals.resultado, hideNumbers)}
            </span>
          </div>
          <span className="ml-auto text-gray-400">Mostrando {paginated.length} de {filtered.length}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            <Search size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium text-gray-500">No se encontraron movimientos</p>
            <p className="text-sm mt-1">{hasActiveFilters ? 'Probá con otros filtros' : 'Registrá el primer movimiento'}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['Fecha/Hora', 'Tipo', 'Categoría', 'Método', 'Monto', 'Nota', 'Usuario', 'Acciones'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginated.map((m) => {
                    const cat = categories.find((c) => c.id === m.categoryId)
                    const usr = users.find((u) => u.id === m.createdBy)
                    const pb = PAYMENT_BADGE[m.paymentMethod]
                    return (
                      <tr key={m.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap tabular-nums text-xs">{formatDateTime(m.createdAt)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={m.type === 'Ingreso' ? 'ingreso' : 'egreso'}>{m.type}</Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{cat?.name || '—'}</td>
                        <td className="px-4 py-3">{pb && <Badge variant={pb.variant}>{pb.label}</Badge>}</td>
                        <td className={`px-4 py-3 font-semibold tabular-nums whitespace-nowrap ${m.type === 'Ingreso' ? 'text-success-700' : 'text-danger-700'}`}>
                          {m.type === 'Egreso' ? '-' : '+'}{formatAmount(m.amount, hideNumbers)}
                        </td>
                        <td className="px-4 py-3 text-gray-500 max-w-[200px]">
                          <span className="truncate block">{m.note || '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{usr?.name || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {canEdit(m) && (
                              <button
                                onClick={() => { setEditTarget(m); setModalOpen(true) }}
                                className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Pencil size={14} />
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => setDeleteTarget(m)}
                                className="p-1.5 text-gray-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <div className="border-t border-gray-200 p-4 flex justify-center">
                <Button variant="secondary" size="sm" onClick={() => setPage((p) => p + 1)}>
                  Ver más ({filtered.length - paginated.length} restantes)
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <MovementModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null) }}
        movement={editTarget}
      />

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Eliminar movimiento" size="sm">
        <p className="text-gray-600 mb-6">
          ¿Eliminás el movimiento de <strong>{formatAmount(deleteTarget?.amount, hideNumbers)}</strong>? Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)} className="flex-1" disabled={deleting}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDelete} className="flex-1" disabled={deleting}>
            {deleting ? <><Loader2 size={14} className="animate-spin" /> Eliminando...</> : 'Eliminar'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
