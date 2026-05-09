import React, { useState, useMemo } from 'react'
import {
  Plus, Settings, Pencil, Trash2, CheckCircle2, RotateCcw,
  Loader2, BookOpen, Building2, X, Check, Banknote,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { formatARS, formatAmount } from '../utils/currency'
import { usePrivacy } from '../context/PrivacyContext'
import { formatDateTime, formatDate, minutesAgo } from '../utils/dateUtils'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'

// ── Colores disponibles para instituciones ────────────────────────────────────
const COLORS = [
  '#2563EB', '#16A34A', '#DC2626', '#D97706',
  '#7C3AED', '#0891B2', '#DB2777', '#65A30D',
  '#9333EA', '#EA580C',
]

// ── Formulario de fiado (nuevo / editar) ─────────────────────────────────────
const EMPTY_FIADO = { description: '', amount: '', note: '', institucionId: '' }

function FiadoModal({ isOpen, onClose, fiado, instituciones, defaultInstitucionId }) {
  const { createFiado, updateFiado } = useData()
  const { user } = useAuth()
  const { addToast } = useToast()

  const [form, setForm] = useState(EMPTY_FIADO)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const isEdit = !!fiado

  React.useEffect(() => {
    if (!isOpen) return
    if (fiado) {
      setForm({ description: fiado.description, amount: String(fiado.amount), note: fiado.note || '', institucionId: fiado.institucionId || '' })
    } else {
      setForm({ ...EMPTY_FIADO, institucionId: defaultInstitucionId || instituciones[0]?.id || '' })
    }
    setErrors({})
    setSaving(false)
  }, [isOpen, fiado, defaultInstitucionId, instituciones])

  function validate() {
    const e = {}
    if (!form.description.trim()) e.description = 'La descripción es obligatoria'
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) e.amount = 'Ingresá un monto válido'
    if (!form.institucionId) e.institucionId = 'Seleccioná una institución'
    return e
  }

  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    const data = { description: form.description.trim(), amount: parseFloat(form.amount), note: form.note.trim(), institucionId: form.institucionId }
    setSaving(true)
    try {
      if (isEdit) {
        await updateFiado(fiado.id, data)
        addToast('Fiado actualizado', 'success')
      } else {
        await createFiado({ ...data, createdBy: user.id })
        addToast('Fiado registrado', 'success')
      }
      onClose()
    } catch {
      addToast('Error al guardar. Revisá la conexión.', 'error')
    } finally {
      setSaving(false)
    }
  }

  function set(field) {
    return (e) => { setForm((f) => ({ ...f, [field]: e.target.value })); setErrors((p) => ({ ...p, [field]: '' })) }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Editar fiado' : 'Nuevo fiado'} size="sm">
      <div className="flex flex-col gap-4">
        {/* Institución */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Institución</label>
          <select
            value={form.institucionId}
            onChange={set('institucionId')}
            className={`w-full rounded-lg border py-2.5 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")] bg-[right_0.5rem_center] bg-no-repeat ${errors.institucionId ? 'border-danger-500 focus:ring-danger-500/20' : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20'}`}
          >
            <option value="">Seleccioná una institución</option>
            {instituciones.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
          {errors.institucionId && <p className="text-xs text-danger-600">{errors.institucionId}</p>}
        </div>

        <Input
          label="Descripción"
          placeholder="Ej: Fotocopias matemática, 50 hojas"
          value={form.description}
          onChange={set('description')}
          error={errors.description}
          autoFocus
        />

        <Input
          label="Monto"
          type="number"
          min="0"
          step="0.01"
          prefix="$"
          placeholder="0,00"
          value={form.amount}
          onChange={set('amount')}
          error={errors.amount}
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Nota <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <textarea
            rows={2}
            placeholder="Observaciones..."
            value={form.note}
            onChange={set('note')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm resize-none focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <Button variant="secondary" onClick={onClose} className="flex-1" disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} className="flex-1" disabled={saving}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : isEdit ? 'Guardar' : 'Registrar fiado'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Modal: pago parcial ───────────────────────────────────────────────────────
function PartialPayModal({ isOpen, onClose, fiado, onSave }) {
  const balance = fiado ? fiado.amount - fiado.amountPaid : 0
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  React.useEffect(() => {
    if (isOpen) { setAmount(''); setError(''); setSaving(false) }
  }, [isOpen])

  async function handleSave() {
    const val = parseFloat(amount)
    if (!amount || isNaN(val) || val <= 0) { setError('Ingresá un monto válido'); return }
    if (val > balance) { setError(`El máximo es ${formatARS(balance)}`); return }
    setSaving(true)
    try {
      await onSave(val)
      onClose()
    } catch {
      setError('Error al registrar el pago')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar pago parcial" size="sm">
      {fiado && (
        <div className="flex flex-col gap-4">
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total del fiado</span>
              <span className="font-semibold text-gray-800">{formatARS(fiado.amount)}</span>
            </div>
            {fiado.amountPaid > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Ya pagado</span>
                <span className="font-semibold text-success-700">{formatARS(fiado.amountPaid)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-200 pt-2">
              <span className="font-semibold text-gray-700">Saldo restante</span>
              <span className="font-bold text-danger-700">{formatARS(balance)}</span>
            </div>
          </div>

          <Input
            label="Monto a cobrar ahora"
            type="number"
            min="0.01"
            step="0.01"
            max={balance}
            prefix="$"
            placeholder="0,00"
            value={amount}
            onChange={e => { setAmount(e.target.value); setError('') }}
            error={error}
            autoFocus
          />

          {/* Acceso rápido: cobrar todo el saldo */}
          {balance > 0 && (
            <button
              type="button"
              onClick={() => { setAmount(String(balance)); setError('') }}
              className="text-xs text-primary-600 hover:text-primary-800 text-left -mt-2"
            >
              Cobrar saldo completo ({formatARS(balance)})
            </button>
          )}

          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={onClose} className="flex-1" disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} className="flex-1" disabled={saving}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Registrando...</> : 'Registrar pago'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ── Modal: gestionar instituciones (Admin) ────────────────────────────────────
const EMPTY_INST = { name: '', description: '', color: '#2563EB' }

function ManageInstituciones({ isOpen, onClose }) {
  const { instituciones, fiados, createInstitucion, updateInstitucion, deleteInstitucion } = useData()
  const { addToast } = useToast()

  const [form, setForm] = useState(EMPTY_INST)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function openEdit(inst) {
    setEditTarget(inst)
    setForm({ name: inst.name, description: inst.description || '', color: inst.color })
    setErrors({})
  }

  function cancelEdit() {
    setEditTarget(null)
    setForm(EMPTY_INST)
    setErrors({})
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'El nombre es obligatorio'
    if (!editTarget && instituciones.some((i) => i.name.toLowerCase() === form.name.trim().toLowerCase()))
      e.name = 'Ya existe una institución con ese nombre'
    return e
  }

  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    const data = { name: form.name.trim(), description: form.description.trim(), color: form.color }
    setSaving(true)
    try {
      if (editTarget) {
        await updateInstitucion(editTarget.id, data)
        addToast('Institución actualizada', 'success')
        cancelEdit()
      } else {
        await createInstitucion(data)
        addToast('Institución creada', 'success')
        setForm(EMPTY_INST)
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
      await deleteInstitucion(deleteTarget.id)
      addToast('Institución eliminada (se eliminaron sus fiados también)', 'info')
    } catch {
      addToast('Error al eliminar', 'error')
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  function set(field) {
    return (e) => { setForm((f) => ({ ...f, [field]: e.target.value })); setErrors((p) => ({ ...p, [field]: '' })) }
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Gestionar instituciones" size="md">
        <div className="flex flex-col gap-5">
          {/* Form crear / editar */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              {editTarget ? `Editando: ${editTarget.name}` : 'Nueva institución'}
            </p>
            <div className="flex flex-col gap-3">
              <Input
                label="Nombre"
                placeholder="Ej: Escuela N° 12, Instituto San Martín"
                value={form.name}
                onChange={set('name')}
                error={errors.name}
              />
              <Input
                label="Descripción (opcional)"
                placeholder="Ej: Secundaria turno mañana"
                value={form.description}
                onChange={set('description')}
              />
              {/* Color picker */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Color identificador</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, color: c }))}
                      style={{ backgroundColor: c }}
                      className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${form.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                    >
                      {form.color === c && <Check size={14} className="text-white mx-auto" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                {editTarget && (
                  <Button variant="secondary" onClick={cancelEdit} size="sm">Cancelar</Button>
                )}
                <Button onClick={handleSave} size="sm" disabled={saving} className="flex-1">
                  {saving ? <><Loader2 size={13} className="animate-spin" /> Guardando...</> : editTarget ? 'Guardar cambios' : 'Crear institución'}
                </Button>
              </div>
            </div>
          </div>

          {/* Lista de instituciones */}
          {instituciones.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No hay instituciones creadas aún</p>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Instituciones existentes</p>
              {instituciones.map((inst) => {
                const count = fiados.filter((f) => f.institucionId === inst.id).length
                const pending = fiados.filter((f) => f.institucionId === inst.id && !f.paid).length
                return (
                  <div key={inst.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50">
                    <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: inst.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{inst.name}</p>
                      <p className="text-xs text-gray-400">
                        {count} fiados · {pending} pendientes
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(inst)} className="p-1.5 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeleteTarget(inst)} className="p-1.5 bg-danger-50 text-danger-600 hover:bg-danger-100 rounded-lg transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* Confirm delete */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Eliminar institución" size="sm">
        <p className="text-gray-600 mb-2">
          ¿Eliminar <strong>{deleteTarget?.name}</strong>?
        </p>
        <p className="text-sm text-danger-600 bg-danger-50 border border-danger-200 rounded-lg px-3 py-2 mb-5">
          Se eliminarán también todos los fiados de esta institución. Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)} className="flex-1" disabled={deleting}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete} className="flex-1" disabled={deleting}>
            {deleting ? <><Loader2 size={14} className="animate-spin" /> Eliminando...</> : 'Eliminar todo'}
          </Button>
        </div>
      </Modal>
    </>
  )
}

// ── Modal: pago a cuenta ──────────────────────────────────────────────────────
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

// ── Página principal ──────────────────────────────────────────────────────────
export default function Fiados() {
  const { instituciones, fiados, updateFiado, deleteFiado, markAllFiadosPaid, pagosCuenta, createPagoCuenta, deletePagoCuenta } = useData()
  const { isAdmin, user } = useAuth()
  const { addToast } = useToast()
  const { hideNumbers } = usePrivacy()

  const [selectedId, setSelectedId] = useState(null)
  const [manageOpen, setManageOpen] = useState(false)
  const [fiadoModal, setFiadoModal] = useState({ open: false, fiado: null })
  const [statusFilter, setStatusFilter] = useState('todos')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [confirmAllOpen, setConfirmAllOpen] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const [partialPayModal, setPartialPayModal] = useState({ open: false, fiado: null })
  const [pagoCuentaOpen, setPagoCuentaOpen] = useState(false)

  // Auto-select first institution
  const selected = instituciones.find((i) => i.id === selectedId) || instituciones[0] || null
  const selectedIdResolved = selected?.id || null

  const instFiados = useMemo(
    () => fiados.filter((f) => f.institucionId === selectedIdResolved),
    [fiados, selectedIdResolved]
  )

  const displayed = useMemo(() => {
    if (statusFilter === 'pendientes') return instFiados.filter((f) => !f.paid)
    if (statusFilter === 'pagados') return instFiados.filter((f) => f.paid)
    return instFiados
  }, [instFiados, statusFilter])

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

  async function handlePartialPay(fiado, payAmount) {
    const newAmountPaid = fiado.amountPaid + payAmount
    const isFullyPaid = newAmountPaid >= fiado.amount
    await updateFiado(fiado.id, {
      amountPaid: newAmountPaid,
      paid: isFullyPaid,
    })
    if (isFullyPaid) {
      addToast('Fiado cobrado completamente', 'success')
    } else {
      const saldo = fiado.amount - newAmountPaid
      addToast(`Pago de ${formatARS(payAmount)} registrado · Saldo: ${formatARS(saldo)}`, 'success')
    }
  }

  async function togglePaid(fiado) {
    setTogglingId(fiado.id)
    try {
      await updateFiado(fiado.id, { paid: !fiado.paid })
      addToast(fiado.paid ? 'Marcado como pendiente' : 'Marcado como pagado', 'success')
    } catch {
      addToast('Error al actualizar', 'error')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleMarkAll() {
    if (!selectedIdResolved) return
    setMarkingAll(true)
    try {
      await markAllFiadosPaid(selectedIdResolved)
      addToast(`Se acreditaron ${kpi.countPendiente} fiados por ${formatARS(kpi.pendiente)}`, 'success')
      setConfirmAllOpen(false)
    } catch {
      addToast('Error al acreditar. Revisá la conexión.', 'error')
    } finally {
      setMarkingAll(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteFiado(deleteTarget.id)
      addToast('Fiado eliminado', 'info')
    } catch {
      addToast('Error al eliminar', 'error')
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  function canEdit(f) {
    if (isAdmin) return true
    return f.createdBy === user.id && minutesAgo(f.createdAt) <= 10
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fiados</h1>
          <p className="text-sm text-gray-500 mt-0.5">Control de créditos por institución</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button variant="secondary" onClick={() => setManageOpen(true)}>
              <Settings size={15} />
              Gestionar instituciones
            </Button>
          )}
          {instituciones.length > 0 && (
            <Button onClick={() => setFiadoModal({ open: true, fiado: null })}>
              <Plus size={16} />
              Nuevo fiado
            </Button>
          )}
        </div>
      </div>

      {/* Empty state: no institutions */}
      {instituciones.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-20 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Building2 size={32} className="text-gray-400" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-700 text-lg">No hay instituciones creadas</p>
            <p className="text-sm text-gray-400 mt-1">
              {isAdmin ? 'Creá la primera institución para empezar a registrar fiados.' : 'El administrador debe crear las instituciones primero.'}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setManageOpen(true)}>
              <Plus size={16} />
              Crear primera institución
            </Button>
          )}
        </div>
      )}

      {/* Institution tabs */}
      {instituciones.length > 0 && (
        <>
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
            {instituciones.map((inst) => {
              const pending = fiados.filter((f) => f.institucionId === inst.id && !f.paid).length
              const isActive = inst.id === selectedIdResolved
              return (
                <button
                  key={inst.id}
                  onClick={() => { setSelectedId(inst.id); setStatusFilter('todos') }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'border-transparent text-white shadow-md'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                  style={isActive ? { backgroundColor: inst.color, borderColor: inst.color } : {}}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.6)' : inst.color }}
                  />
                  {inst.name}
                  {pending > 0 && (
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-danger-100 text-danger-700'}`}>
                      {pending}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {selected && (
            <>
              {/* KPI cards */}
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

              {/* Filter + table */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: selected.color }}
                    />
                    <span className="font-semibold text-gray-900 text-sm">{selected.name}</span>
                    {selected.description && (
                      <span className="text-xs text-gray-400">— {selected.description}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Pago a cuenta */}
                    <Button variant="secondary" size="sm" onClick={() => setPagoCuentaOpen(true)}>
                      <Banknote size={14} />
                      Pago a cuenta
                    </Button>
                  {/* Cobrar todo */}
                    {kpi.countPendiente > 0 && (
                      <Button variant="success" size="sm" onClick={() => setConfirmAllOpen(true)}>
                        <CheckCircle2 size={14} />
                        Cobrar todo · {formatAmount(kpi.pendiente, hideNumbers)}
                      </Button>
                    )}
                  {/* Status filter */}
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                    {[
                      { key: 'todos', label: 'Todos' },
                      { key: 'pendientes', label: 'Pendientes' },
                      { key: 'pagados', label: 'Cobrados' },
                    ].map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setStatusFilter(f.key)}
                        className={`px-3 py-1.5 font-medium transition-colors ${
                          statusFilter === f.key
                            ? 'bg-primary-600 text-white'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  </div>
                </div>

                {displayed.length === 0 ? (
                  <div className="py-14 flex flex-col items-center gap-3 text-gray-400">
                    <BookOpen size={36} className="opacity-30" />
                    <div className="text-center">
                      <p className="font-medium text-gray-500">
                        {instFiados.length === 0 ? 'No hay fiados para esta institución' : 'No hay items en este filtro'}
                      </p>
                      {instFiados.length === 0 && (
                        <p className="text-sm mt-1">Registrá el primer fiado con el botón "Nuevo fiado"</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          {['Fecha', 'Descripción', 'Monto', 'Estado', 'Cobrado el', 'Nota', 'Usuario', 'Acciones'].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {displayed.map((f) => {
                          const usr = null // users not in scope here, could add
                          const isToggling = togglingId === f.id
                          return (
                            <tr key={f.id} className={`hover:bg-gray-50 transition-colors ${f.paid ? 'opacity-70' : ''}`}>
                              <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs tabular-nums">
                                {formatDate(f.createdAt)}
                              </td>
                              <td className="px-4 py-3 font-medium text-gray-800 max-w-[200px]">
                                <span className="truncate block">{f.description}</span>
                              </td>
                              <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                                <span className={`font-semibold ${f.paid ? 'text-success-700' : 'text-danger-700'}`}>
                                  {formatAmount(f.amount, hideNumbers)}
                                </span>
                                {!f.paid && f.amountPaid > 0 && (
                                  <div className="text-xs text-gray-400 mt-0.5">
                                    Saldo: {formatAmount(f.amount - f.amountPaid, hideNumbers)}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {f.paid ? (
                                  <Badge variant="active">Cobrado</Badge>
                                ) : f.amountPaid > 0 ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                    Parcial · {formatAmount(f.amountPaid, hideNumbers)}
                                  </span>
                                ) : (
                                  <Badge variant="egreso">Pendiente</Badge>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                                {f.paidAt ? formatDateTime(f.paidAt) : '—'}
                              </td>
                              <td className="px-4 py-3 text-gray-500 max-w-[160px]">
                                <span className="truncate block">{f.note || '—'}</span>
                              </td>
                              <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">—</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1">
                                  {/* Pago parcial (solo si pendiente) */}
                                  {!f.paid && (
                                    <button
                                      onClick={() => setPartialPayModal({ open: true, fiado: f })}
                                      className="p-1.5 rounded-lg transition-colors bg-amber-50 text-amber-600 hover:bg-amber-100"
                                      title="Registrar pago parcial"
                                    >
                                      <Banknote size={14} />
                                    </button>
                                  )}
                                  {/* Toggle paid */}
                                  <button
                                    onClick={() => togglePaid(f)}
                                    disabled={isToggling}
                                    className={`p-1.5 rounded-lg transition-colors ${
                                      f.paid
                                        ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                        : 'bg-success-50 text-success-600 hover:bg-success-100'
                                    }`}
                                    title={f.paid ? 'Marcar como pendiente' : 'Marcar como cobrado total'}
                                  >
                                    {isToggling ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : f.paid ? (
                                      <RotateCcw size={14} />
                                    ) : (
                                      <CheckCircle2 size={14} />
                                    )}
                                  </button>
                                  {/* Edit */}
                                  {canEdit(f) && (
                                    <button
                                      onClick={() => setFiadoModal({ open: true, fiado: f })}
                                      className="p-1.5 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
                                      title="Editar"
                                    >
                                      <Pencil size={14} />
                                    </button>
                                  )}
                                  {/* Delete (admin only) */}
                                  {isAdmin && (
                                    <button
                                      onClick={() => setDeleteTarget(f)}
                                      className="p-1.5 bg-danger-50 text-danger-600 hover:bg-danger-100 rounded-lg transition-colors"
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
                )}
              </div>

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
            </>
          )}
        </>
      )}

      {/* Modals */}
      <FiadoModal
        isOpen={fiadoModal.open}
        onClose={() => setFiadoModal({ open: false, fiado: null })}
        fiado={fiadoModal.fiado}
        instituciones={instituciones}
        defaultInstitucionId={selectedIdResolved}
      />

      <ManageInstituciones isOpen={manageOpen} onClose={() => setManageOpen(false)} />

      <PartialPayModal
        isOpen={partialPayModal.open}
        onClose={() => setPartialPayModal({ open: false, fiado: null })}
        fiado={partialPayModal.fiado}
        onSave={(amount) => handlePartialPay(partialPayModal.fiado, amount)}
      />

      <PagoCuentaModal
        isOpen={pagoCuentaOpen}
        onClose={() => setPagoCuentaOpen(false)}
        institucionId={selectedIdResolved}
      />

      {/* Confirm mark all paid */}
      <Modal isOpen={confirmAllOpen} onClose={() => setConfirmAllOpen(false)} title="Cobrar todo el saldo pendiente" size="sm">
        <div className="flex flex-col gap-4">
          <div className="bg-success-50 border border-success-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-success-700 tabular-nums">{formatAmount(kpi.pendiente, hideNumbers)}</p>
            <p className="text-sm text-success-600 mt-1">{kpi.countPendiente} items pendientes · {selected?.name}</p>
          </div>
          <p className="text-sm text-gray-600 text-center">
            Se van a marcar como <strong>cobrados</strong> todos los fiados pendientes de esta institución con la fecha y hora actual.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setConfirmAllOpen(false)} className="flex-1" disabled={markingAll}>
              Cancelar
            </Button>
            <Button variant="success" onClick={handleMarkAll} className="flex-1" disabled={markingAll}>
              {markingAll
                ? <><Loader2 size={14} className="animate-spin" /> Acreditando...</>
                : <><CheckCircle2 size={15} /> Confirmar cobro</>}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Eliminar fiado" size="sm">
        <p className="text-gray-600 mb-6">
          ¿Eliminás el fiado <strong>"{deleteTarget?.description}"</strong> de <strong>{formatARS(deleteTarget?.amount)}</strong>?
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
