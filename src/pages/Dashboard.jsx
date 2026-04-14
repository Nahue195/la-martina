import React, { useState, useMemo } from 'react'
import {
  Plus, Wallet, CreditCard, Smartphone, DollarSign, BarChart3,
  Lock, CheckCircle2, AlertTriangle, CalendarClock, Calendar, Unlock,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { getDateRange, isInDateRange, formatDateTime, formatDate, toInputDate } from '../utils/dateUtils'
import { formatARS } from '../utils/currency'
import KPICard from '../components/KPICard'
import Badge, { PAYMENT_BADGE } from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import MovementModal from '../components/MovementModal'

const FILTERS = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'semana', label: 'Esta semana' },
  { key: 'mes', label: 'Este mes' },
  { key: 'personalizado', label: 'Personalizado' },
]

export default function Dashboard() {
  const { movements, categories, users, cierres, createCierre, deleteCierre, cycleStart, setCycleStart } = useData()
  const { user, isAdmin } = useAuth()
  const { addToast } = useToast()

  const [dateFilter, setDateFilter] = useState('hoy')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  // Cerrar caja
  const [closingModal, setClosingModal] = useState(false)
  const [closingNote, setClosingNote] = useState('')
  const [closing, setClosing] = useState(false)

  // Abrir caja
  const [openingModal, setOpeningModal] = useState(false)
  const [opening, setOpening] = useState(false)

  // Ciclo de caja
  const [cycleModal, setCycleModal] = useState(false)
  const [cycleInput, setCycleInput] = useState('')

  const { start, end } = useMemo(
    () => getDateRange(dateFilter, customStart, customEnd),
    [dateFilter, customStart, customEnd]
  )

  const filtered = useMemo(
    () => movements.filter((m) => isInDateRange(m.createdAt, start, end)),
    [movements, start, end]
  )

  const kpi = useMemo(() => {
    const ingresos = filtered
      .filter((m) => m.type === 'Ingreso')
      .reduce((sum, m) => sum + m.amount, 0)
    const egresos = filtered
      .filter((m) => m.type === 'Egreso')
      .reduce((sum, m) => sum + m.amount, 0)

    const balanceByMethod = (method) => {
      const inc = filtered
        .filter((m) => m.paymentMethod === method && m.type === 'Ingreso')
        .reduce((s, m) => s + m.amount, 0)
      const exp = filtered
        .filter((m) => m.paymentMethod === method && m.type === 'Egreso')
        .reduce((s, m) => s + m.amount, 0)
      return inc - exp
    }

    const cash = balanceByMethod('Cash')
    const qr = balanceByMethod('QRTransfer')
    const card = balanceByMethod('Card')

    return { ingresos, egresos, resultado: ingresos - egresos, cash, qr, card, total: cash + qr + card }
  }, [filtered])

  const last20 = useMemo(() => movements.slice(0, 20), [movements])

  const today = new Date().toISOString().slice(0, 10)
  const todayCierre = useMemo(() => cierres.find((c) => c.fecha === today), [cierres, today])

  const postCierreMovements = useMemo(() => {
    if (!todayCierre || dateFilter !== 'hoy') return []
    return filtered.filter((m) => new Date(m.createdAt) > new Date(todayCierre.createdAt))
  }, [filtered, todayCierre, dateFilter])

  const handleCerrarCaja = async () => {
    try {
      setClosing(true)
      await createCierre({
        fecha: today,
        ingresos: kpi.ingresos,
        egresos: kpi.egresos,
        resultado: kpi.resultado,
        cash: kpi.cash,
        qr: kpi.qr,
        card: kpi.card,
        total: kpi.total,
        nota: closingNote,
        cerradoPor: user.id,
      })
      setClosingModal(false)
      setClosingNote('')
      addToast('Caja cerrada exitosamente', 'success')
    } catch {
      addToast('Error al cerrar caja. ¿Ya fue cerrada hoy?', 'error')
    } finally {
      setClosing(false)
    }
  }

  const handleAbrirCaja = async () => {
    if (!todayCierre) return
    try {
      setOpening(true)
      await deleteCierre(todayCierre.id)
      setOpeningModal(false)
      addToast('Caja abierta correctamente', 'success')
    } catch {
      addToast('Error al abrir la caja', 'error')
    } finally {
      setOpening(false)
    }
  }

  const [savingCycle, setSavingCycle] = useState(false)

  const handleSaveCycle = async () => {
    try {
      setSavingCycle(true)
      await setCycleStart(cycleInput || null)
      setCycleModal(false)
      addToast(cycleInput ? `Ciclo iniciado desde ${formatDate(cycleInput)}` : 'Se muestran todos los datos', 'success')
    } catch {
      addToast('Error al guardar la configuración', 'error')
    } finally {
      setSavingCycle(false)
    }
  }

  const openCycleModal = () => {
    setCycleInput(cycleStart || toInputDate(new Date().toISOString()))
    setCycleModal(true)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm text-gray-500">Resumen de caja y balances</p>
            {cycleStart && (
              <span className="flex items-center gap-1 text-xs text-primary-600 bg-primary-50 border border-primary-100 px-2 py-0.5 rounded-full">
                <CalendarClock size={10} />
                Ciclo desde {formatDate(cycleStart)}
              </span>
            )}
            {isAdmin && (
              <button
                onClick={openCycleModal}
                className="text-xs text-gray-400 hover:text-primary-600 transition-colors"
              >
                {cycleStart ? 'cambiar' : '+ configurar ciclo'}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && dateFilter === 'hoy' && (
            todayCierre ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-2 bg-success-50 border border-success-200 rounded-lg text-sm font-medium text-success-700">
                  <CheckCircle2 size={15} />
                  Caja cerrada
                  <span className="text-success-500 font-normal ml-0.5">
                    {new Date(todayCierre.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <Button variant="secondary" onClick={() => setOpeningModal(true)}>
                  <Unlock size={15} />
                  Abrir caja
                </Button>
              </div>
            ) : (
              <Button variant="secondary" onClick={() => setClosingModal(true)}>
                <Lock size={15} />
                Cerrar caja
              </Button>
            )
          )}
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} />
            Nuevo movimiento
          </Button>
        </div>
      </div>

      {/* Post-cierre alert */}
      {postCierreMovements.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
          <span>
            Se registraron{' '}
            <strong>{postCierreMovements.length} movimiento{postCierreMovements.length > 1 ? 's' : ''}</strong>{' '}
            después del cierre de caja. El balance actual difiere del cierre registrado.
          </span>
        </div>
      )}

      {/* Date filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setDateFilter(f.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                dateFilter === f.key
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {dateFilter === 'personalizado' && (
          <div className="flex items-center gap-2 ml-1">
            <Input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="py-2 text-sm"
            />
            <span className="text-gray-400 text-sm">–</span>
            <Input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="py-2 text-sm"
            />
          </div>
        )}
      </div>

      {/* KPI Row 1 */}
      <div className="grid grid-cols-3 gap-4">
        <KPICard label="Ingresos totales" amount={kpi.ingresos} variant="ingreso" />
        <KPICard label="Egresos totales" amount={kpi.egresos} variant="egreso" />
        <KPICard label="Resultado" amount={kpi.resultado} variant="resultado" />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard label="Saldo Efectivo" amount={kpi.cash} variant="neutral" icon={Wallet} subtitle="Cash" />
        <KPICard label="Saldo QR/Trans." amount={kpi.qr} variant="neutral" icon={Smartphone} subtitle="QR/Transferencia" />
        <KPICard label="Saldo Tarjeta" amount={kpi.card} variant="neutral" icon={CreditCard} subtitle="Tarjeta" />
        <KPICard label="Total General" amount={kpi.total} variant="primary" icon={DollarSign} subtitle="Suma de métodos" />
      </div>

      {/* Recent movements */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-gray-400" />
            <h2 className="font-semibold text-gray-900">Últimos 20 movimientos</h2>
            {filtered.length !== movements.length && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {filtered.length} en el período
              </span>
            )}
          </div>
        </div>

        {last20.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <BarChart3 size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No hay movimientos aún</p>
            <p className="text-sm mt-1">Registrá el primer movimiento del día</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Fecha/Hora', 'Tipo', 'Categoría', 'Método', 'Monto', 'Nota', 'Usuario'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {last20.map((m) => {
                  const cat = categories.find((c) => c.id === m.categoryId)
                  const usr = users.find((u) => u.id === m.createdBy)
                  const pb = PAYMENT_BADGE[m.paymentMethod]
                  return (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap tabular-nums">
                        {formatDateTime(m.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={m.type === 'Ingreso' ? 'ingreso' : 'egreso'}>{m.type}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{cat?.name || '—'}</td>
                      <td className="px-4 py-3">
                        {pb && <Badge variant={pb.variant}>{pb.label}</Badge>}
                      </td>
                      <td
                        className={`px-4 py-3 font-semibold tabular-nums whitespace-nowrap ${
                          m.type === 'Ingreso' ? 'text-success-700' : 'text-danger-700'
                        }`}
                      >
                        {m.type === 'Egreso' ? '-' : ''}
                        {formatARS(m.amount)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">
                        {m.note || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{usr?.name || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <MovementModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      {/* Cerrar Caja Modal */}
      <Modal
        isOpen={closingModal}
        onClose={() => { setClosingModal(false); setClosingNote('') }}
        title="Cerrar caja"
        size="sm"
      >
        <div className="space-y-5">
          <p className="text-sm text-gray-500">
            Registrá el cierre del día de hoy con el balance actual.
          </p>
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-y divide-gray-100">
              <div className="px-4 py-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Ingresos</p>
                <p className="text-lg font-bold text-success-700 tabular-nums mt-0.5">{formatARS(kpi.ingresos)}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Egresos</p>
                <p className="text-lg font-bold text-danger-700 tabular-nums mt-0.5">{formatARS(kpi.egresos)}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Efectivo</p>
                <p className="text-base font-semibold text-gray-800 tabular-nums mt-0.5">{formatARS(kpi.cash)}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">QR / Transfer.</p>
                <p className="text-base font-semibold text-gray-800 tabular-nums mt-0.5">{formatARS(kpi.qr)}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Tarjeta</p>
                <p className="text-base font-semibold text-gray-800 tabular-nums mt-0.5">{formatARS(kpi.card)}</p>
              </div>
              <div className="px-4 py-3 bg-primary-50">
                <p className="text-xs text-primary-600 uppercase tracking-wider font-semibold">Resultado</p>
                <p className={`text-base font-bold tabular-nums mt-0.5 ${kpi.resultado >= 0 ? 'text-success-700' : 'text-danger-700'}`}>
                  {formatARS(kpi.resultado)}
                </p>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nota (opcional)</label>
            <textarea
              value={closingNote}
              onChange={(e) => setClosingNote(e.target.value)}
              placeholder="Ej: Se cerró a las 20hs, faltó rendir $500..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => { setClosingModal(false); setClosingNote('') }}>
              Cancelar
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleCerrarCaja} disabled={closing}>
              <Lock size={14} />
              {closing ? 'Cerrando...' : 'Confirmar cierre'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Abrir Caja Modal */}
      <Modal
        isOpen={openingModal}
        onClose={() => setOpeningModal(false)}
        title="Abrir caja"
        size="sm"
      >
        <div className="space-y-5">
          <p className="text-sm text-gray-500">
            Esto eliminará el cierre registrado hoy a las{' '}
            <strong>
              {todayCierre && new Date(todayCierre.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </strong>.
            Todos los movimientos del día quedan intactos y podrás cerrar la caja nuevamente cuando quieras.
          </p>
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setOpeningModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleAbrirCaja} disabled={opening}>
              <Unlock size={14} />
              {opening ? 'Abriendo...' : 'Confirmar apertura'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Ciclo Modal */}
      <Modal
        isOpen={cycleModal}
        onClose={() => setCycleModal(false)}
        title="Configurar ciclo de caja"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Definí desde qué fecha se muestran los movimientos en toda la app.
            Los datos anteriores quedan guardados pero no se verán.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Calendar size={13} className="inline mr-1.5 text-gray-400" />
              Inicio del ciclo
            </label>
            <Input
              type="date"
              value={cycleInput}
              onChange={(e) => setCycleInput(e.target.value)}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setCycleModal(false)}>
              Cancelar
            </Button>
            {cycleStart && (
              <Button
                variant="ghost"
                onClick={async () => { await setCycleStart(null); setCycleModal(false); addToast('Se muestran todos los datos', 'info') }}
              >
                Ver todo
              </Button>
            )}
            <Button variant="primary" className="flex-1" onClick={handleSaveCycle} disabled={!cycleInput || savingCycle}>
              Guardar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
