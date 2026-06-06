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
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:border-primary-500 focus:ring-primary-500/20"
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
  const { gastosFijos, gastosMes, updateGastoMes, deleteGastoMes, seedGastosMes, createMovement } = useData()
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
  const [pagoModal, setPagoModal] = useState({ open: false, gasto: null })
  const [pagoMethod, setPagoMethod] = useState('Cash')
  const [confirmingPago, setConfirmingPago] = useState(false)

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
    // Solo para revertir (pagado → pendiente), sin crear movimiento
    setTogglingId(g.id)
    try {
      await updateGastoMes(g.id, { pagado: false })
      addToast('Gasto revertido a pendiente', 'info')
    } catch {
      addToast('Error al actualizar', 'error')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleConfirmarPago() {
    const g = pagoModal.gasto
    if (!g) return
    setConfirmingPago(true)
    try {
      await createMovement({
        type: 'Egreso',
        amount: g.monto,
        paymentMethod: pagoMethod,
        categoryId: null,
        note: g.nombre,
        createdBy: user.id,
      })
      await updateGastoMes(g.id, { pagado: true })
      setPagoModal({ open: false, gasto: null })
      addToast('Pago registrado como egreso en Movimientos', 'success')
    } catch {
      addToast('Error al registrar el pago', 'error')
    } finally {
      setConfirmingPago(false)
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
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        g.pagado ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700'
                      }`}>
                        {g.pagado && <Check size={11} />}
                        {g.pagado ? 'Pagado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[200px]">
                      <span className="truncate block">{g.nota || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => g.pagado ? togglePagado(g) : setPagoModal({ open: true, gasto: g })}
                          disabled={togglingId === g.id}
                          className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                            g.pagado
                              ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                              : 'bg-success-50 text-success-600 hover:bg-success-100'
                          }`}
                          title={g.pagado ? 'Revertir a pendiente' : 'Marcar como pagado'}
                        >
                          {togglingId === g.id
                            ? <Loader2 size={14} className="animate-spin" />
                            : <Check size={14} />}
                        </button>
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

      {/* Modal: registrar pago como egreso */}
      <Modal isOpen={pagoModal.open} onClose={() => setPagoModal({ open: false, gasto: null })} title="Registrar pago" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Se registrará un egreso de{' '}
            <strong className="text-gray-800">{pagoModal.gasto ? formatARS(pagoModal.gasto.monto) : ''}</strong>
            {' '}por <strong className="text-gray-800">{pagoModal.gasto?.nombre}</strong> en Movimientos.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Método de pago</label>
            <div className="flex gap-2">
              {[
                { key: 'Cash', label: 'Efectivo' },
                { key: 'QRTransfer', label: 'QR / Transfer.' },
                { key: 'Card', label: 'Tarjeta' },
              ].map(m => (
                <button
                  key={m.key}
                  onClick={() => setPagoMethod(m.key)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    pagoMethod === m.key
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setPagoModal({ open: false, gasto: null })} className="flex-1" disabled={confirmingPago}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarPago} className="flex-1" disabled={confirmingPago}>
              {confirmingPago ? <><Loader2 size={14} className="animate-spin" /> Registrando...</> : 'Confirmar pago'}
            </Button>
          </div>
        </div>
      </Modal>

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
