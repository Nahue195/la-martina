import React, { useState, useMemo } from 'react'
import { BarChart2, ChevronDown, Hash, CheckCircle2 } from 'lucide-react'
import { useData } from '../context/DataContext'
import { getDateRange, isInDateRange } from '../utils/dateUtils'
import { formatAmount } from '../utils/currency'
import { usePrivacy } from '../context/PrivacyContext'
import KPICard from '../components/KPICard'
import Badge, { PAYMENT_BADGE } from '../components/ui/Badge'
import Input from '../components/ui/Input'

const PERIODS = [
  { key: 'semana', label: 'Esta semana' },
  { key: 'mes', label: 'Este mes' },
  { key: 'mes_pasado', label: 'Mes pasado' },
  { key: 'personalizado', label: 'Personalizado' },
]

function getPeriodRange(period, customStart, customEnd) {
  if (period === 'mes_pasado') {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    return { start, end }
  }
  return getDateRange(period, customStart, customEnd)
}

function getDatesInRange(start, end) {
  const dates = []
  const current = new Date(start)
  current.setHours(0, 0, 0, 0)
  const endDay = new Date(end)
  endDay.setHours(23, 59, 59, 999)
  while (current <= endDay) {
    dates.push(current.toISOString().slice(0, 10))
    current.setDate(current.getDate() + 1)
  }
  return dates
}

export default function Analytics() {
  const { movements, categories, users, cierres } = useData()
  const { hideNumbers } = usePrivacy()
  const [period, setPeriod] = useState('semana')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [expandedDay, setExpandedDay] = useState(null)

  const { start, end } = useMemo(
    () => getPeriodRange(period, customStart, customEnd),
    [period, customStart, customEnd]
  )

  const filtered = useMemo(
    () => movements.filter((m) => isInDateRange(m.createdAt, start, end)),
    [movements, start, end]
  )

  const allDates = useMemo(() => getDatesInRange(start, end), [start, end])

  const dayStats = useMemo(() => {
    const map = {}
    filtered.forEach((m) => {
      const day = m.createdAt.slice(0, 10)
      if (!map[day]) map[day] = { ingresos: 0, egresos: 0, movements: [] }
      if (m.type === 'Ingreso') map[day].ingresos += m.amount
      else map[day].egresos += m.amount
      map[day].movements.push(m)
    })
    return allDates.map((date) => ({
      date,
      ingresos: map[date]?.ingresos || 0,
      egresos: map[date]?.egresos || 0,
      movements: map[date]?.movements || [],
      resultado: (map[date]?.ingresos || 0) - (map[date]?.egresos || 0),
      cierre: cierres.find((c) => c.fecha === date) || null,
    }))
  }, [allDates, filtered, cierres])

  const kpi = useMemo(() => {
    const ingresos = filtered.filter((m) => m.type === 'Ingreso').reduce((s, m) => s + m.amount, 0)
    const egresos = filtered.filter((m) => m.type === 'Egreso').reduce((s, m) => s + m.amount, 0)
    return { ingresos, egresos, resultado: ingresos - egresos, count: filtered.length }
  }, [filtered])

  const maxChartVal = useMemo(
    () => Math.max(...dayStats.map((d) => Math.max(d.ingresos, d.egresos)), 1),
    [dayStats]
  )

  const daysWithMovements = dayStats.filter((d) => d.movements.length > 0)

  const toggleDay = (date) => setExpandedDay((prev) => (prev === date ? null : date))

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Análisis detallado por período</p>
      </div>

      {/* Period tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => { setPeriod(p.key); setExpandedDay(null) }}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                period === p.key ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {period === 'personalizado' && (
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

      {/* KPI Summary */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard label="Ingresos" amount={kpi.ingresos} variant="ingreso" />
        <KPICard label="Egresos" amount={kpi.egresos} variant="egreso" />
        <KPICard label="Resultado" amount={kpi.resultado} variant="resultado" />
        <div className="rounded-xl border border-gray-200 bg-white p-5 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Movimientos</p>
            <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{kpi.count}</p>
            <p className="text-xs text-gray-400 mt-0.5">en el período</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
            <Hash size={20} className="text-gray-600" />
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900">Evolución diaria</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-success-500" />
              <span className="text-xs text-gray-500">Ingresos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-danger-500" />
              <span className="text-xs text-gray-500">Egresos</span>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="h-28 flex items-center justify-center text-gray-300 text-sm">
            Sin datos en este período
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ minWidth: `${Math.max(allDates.length * 44, 280)}px` }}>
              {/* Bars — fixed pixel heights to avoid CSS percentage issues in flex */}
              <div className="flex items-end gap-1" style={{ height: '112px', marginBottom: '6px' }}>
                {dayStats.map((day) => {
                  const ingH = day.ingresos > 0 ? Math.max(Math.round((day.ingresos / maxChartVal) * 112), 4) : 2
                  const egrH = day.egresos > 0 ? Math.max(Math.round((day.egresos / maxChartVal) * 112), 4) : 2
                  return (
                    <div
                      key={day.date}
                      className="flex items-end gap-px flex-1 group cursor-pointer"
                      onClick={() => day.movements.length > 0 && toggleDay(day.date)}
                      title={`${day.date} · Ing: ${formatAmount(day.ingresos, hideNumbers)} · Egr: ${formatAmount(day.egresos, hideNumbers)}`}
                    >
                      <div
                        className={`flex-1 rounded-t-sm transition-colors ${
                          expandedDay === day.date ? 'bg-success-600' : 'bg-success-500 group-hover:bg-success-600'
                        }`}
                        style={{ height: `${ingH}px`, opacity: day.ingresos > 0 ? 1 : 0.2 }}
                      />
                      <div
                        className={`flex-1 rounded-t-sm transition-colors ${
                          expandedDay === day.date ? 'bg-danger-600' : 'bg-danger-500 group-hover:bg-danger-600'
                        }`}
                        style={{ height: `${egrH}px`, opacity: day.egresos > 0 ? 1 : 0.2 }}
                      />
                    </div>
                  )
                })}
              </div>
              {/* Date labels */}
              <div className="flex gap-1">
                {dayStats.map((day) => (
                  <div key={day.date} className="flex-1 text-center">
                    <span className="text-[10px] text-gray-400 leading-none">
                      {new Date(day.date + 'T12:00:00').toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: allDates.length <= 7 ? 'short' : '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Day-by-day detail table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <BarChart2 size={18} className="text-gray-400" />
            <h2 className="font-semibold text-gray-900">Desglose por día</h2>
          </div>
          <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            {daysWithMovements.length} día{daysWithMovements.length !== 1 ? 's' : ''} con actividad
          </span>
        </div>

        {/* Column headers */}
        <div className="flex items-center px-6 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <div className="w-48">Fecha</div>
          <div className="w-20 text-center">Movim.</div>
          <div className="flex-1 text-right">Ingresos</div>
          <div className="flex-1 text-right">Egresos</div>
          <div className="flex-1 text-right">Resultado</div>
          <div className="w-32 text-right">Estado</div>
        </div>

        {daysWithMovements.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <BarChart2 size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">Sin movimientos en este período</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {daysWithMovements.map((day) => (
              <div key={day.date}>
                {/* Day row */}
                <div
                  className={`flex items-center px-6 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors ${
                    expandedDay === day.date ? 'bg-primary-50/40' : ''
                  }`}
                  onClick={() => toggleDay(day.date)}
                >
                  <div className="w-48">
                    <span className="font-medium text-gray-900 capitalize text-sm">
                      {new Date(day.date + 'T12:00:00').toLocaleDateString('es-AR', {
                        weekday: 'short',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="w-20 text-center">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full tabular-nums font-medium">
                      {day.movements.length}
                    </span>
                  </div>
                  <div className="flex-1 text-right text-sm font-medium text-success-700 tabular-nums">
                    {formatAmount(day.ingresos, hideNumbers)}
                  </div>
                  <div className="flex-1 text-right text-sm font-medium text-danger-700 tabular-nums">
                    {formatAmount(day.egresos, hideNumbers)}
                  </div>
                  <div
                    className={`flex-1 text-right text-sm font-bold tabular-nums ${
                      day.resultado > 0
                        ? 'text-success-700'
                        : day.resultado < 0
                        ? 'text-danger-700'
                        : 'text-gray-500'
                    }`}
                  >
                    {formatAmount(day.resultado, hideNumbers)}
                  </div>
                  <div className="w-32 flex items-center justify-end gap-2">
                    {day.cierre ? (
                      <span className="text-xs bg-success-100 text-success-700 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                        <CheckCircle2 size={10} />
                        Cerrada
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">Abierta</span>
                    )}
                    <ChevronDown
                      size={15}
                      className={`text-gray-400 transition-transform duration-200 shrink-0 ${
                        expandedDay === day.date ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Expanded: individual movements */}
                {expandedDay === day.date && (
                  <div className="bg-gray-50 border-t border-gray-100">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-100 border-b border-gray-200">
                            <th className="pl-16 pr-4 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider whitespace-nowrap">
                              Hora
                            </th>
                            <th className="px-4 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider">
                              Tipo
                            </th>
                            <th className="px-4 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider whitespace-nowrap">
                              Categoría
                            </th>
                            <th className="px-4 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider">
                              Método
                            </th>
                            <th className="px-4 py-2.5 text-right text-gray-500 font-semibold uppercase tracking-wider">
                              Monto
                            </th>
                            <th className="px-4 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider">
                              Nota
                            </th>
                            <th className="px-4 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wider">
                              Usuario
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {[...day.movements]
                            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                            .map((m) => {
                              const cat = categories.find((c) => c.id === m.categoryId)
                              const usr = users.find((u) => u.id === m.createdBy)
                              const pb = PAYMENT_BADGE[m.paymentMethod]
                              return (
                                <tr key={m.id} className="hover:bg-white transition-colors">
                                  <td className="pl-16 pr-4 py-2.5 text-gray-500 tabular-nums whitespace-nowrap">
                                    {new Date(m.createdAt).toLocaleTimeString('es-AR', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <Badge variant={m.type === 'Ingreso' ? 'ingreso' : 'egreso'}>
                                      {m.type}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                                    {cat?.name || '—'}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    {pb && <Badge variant={pb.variant}>{pb.label}</Badge>}
                                  </td>
                                  <td
                                    className={`px-4 py-2.5 font-semibold tabular-nums text-right whitespace-nowrap ${
                                      m.type === 'Ingreso' ? 'text-success-700' : 'text-danger-700'
                                    }`}
                                  >
                                    {m.type === 'Egreso' ? '-' : ''}
                                    {formatAmount(m.amount, hideNumbers)}
                                  </td>
                                  <td className="px-4 py-2.5 text-gray-500 max-w-[140px] truncate">
                                    {m.note || <span className="text-gray-300">—</span>}
                                  </td>
                                  <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                                    {usr?.name || '—'}
                                  </td>
                                </tr>
                              )
                            })}
                        </tbody>
                      </table>
                    </div>

                    {/* Cierre info */}
                    {day.cierre && (
                      <div className="px-6 py-2 bg-success-50 border-t border-success-100 flex items-center gap-2 text-xs text-success-700">
                        <CheckCircle2 size={12} className="shrink-0" />
                        <span>
                          Caja cerrada a las{' '}
                          {new Date(day.cierre.createdAt).toLocaleTimeString('es-AR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {day.cierre.nota && ` · ${day.cierre.nota}`}
                        </span>
                      </div>
                    )}

                    {/* Day totals footer */}
                    <div className="px-6 py-3 bg-gray-100 border-t border-gray-200 flex items-center justify-end gap-6 text-xs font-semibold">
                      <span className="text-success-700 tabular-nums">
                        Ingresos: {formatAmount(day.ingresos, hideNumbers)}
                      </span>
                      <span className="text-danger-700 tabular-nums">
                        Egresos: {formatAmount(day.egresos, hideNumbers)}
                      </span>
                      <span
                        className={`tabular-nums ${
                          day.resultado >= 0 ? 'text-success-700' : 'text-danger-700'
                        }`}
                      >
                        Resultado: {formatAmount(day.resultado, hideNumbers)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
