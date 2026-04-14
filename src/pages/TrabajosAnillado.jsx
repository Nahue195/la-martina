import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  Paperclip, Plus, Search, X, Edit2, Trash2,
  CheckCircle, Clock, AlertCircle, FileText, Upload, ExternalLink, Download, Loader2,
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { db } from '../utils/db'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import { formatARS } from '../utils/currency'

// ─── helpers ──────────────────────────────────────────────────────────────────

const ESTADO_CFG = {
  pendiente:  { label: 'Pendiente',          cls: 'bg-gray-100 text-gray-700' },
  en_proceso: { label: 'En proceso',         cls: 'bg-blue-100 text-blue-800' },
  listo:      { label: 'Listo para retirar', cls: 'bg-green-100 text-green-800' },
  entregado:  { label: 'Entregado',          cls: 'bg-slate-100 text-slate-500' },
}

const TIPO_CFG = {
  espiral:   'Espiral',
  tapa_dura: 'Tapa dura',
  rustica:   'Rústica',
}

function shortDate(dateStr) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function todayStr() { return new Date().toISOString().split('T')[0] }
function tomorrowStr() {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

function getUrgency(item) {
  if (item.estado === 'entregado') return null
  const t = todayStr()
  const tm = tomorrowStr()
  if (item.fechaEntrega < t) return 'overdue'
  if (item.fechaEntrega === t) return 'today'
  if (item.fechaEntrega === tm) return 'tomorrow'
  return null
}

const URGENCY_ROW = {
  overdue:  'bg-red-50',
  today:    'bg-amber-50',
  tomorrow: 'bg-yellow-50',
}

const URGENCY_BADGE = {
  overdue:  { label: 'Vencido', cls: 'bg-red-100 text-red-700' },
  today:    { label: 'Hoy',     cls: 'bg-amber-100 text-amber-800' },
  tomorrow: { label: 'Mañana',  cls: 'bg-yellow-100 text-yellow-800' },
}

const EMPTY = {
  cliente: '', telefono: '', descripcion: '', cantidad: 1,
  tipoAnillado: 'espiral', fechaEntrega: tomorrowStr(),
  precio: '', estado: 'pendiente', notas: '',
}

// ─── component ────────────────────────────────────────────────────────────────

export default function TrabajosAnillado() {
  const { trabajosAnillado, createTrabajoAnillado, updateTrabajoAnillado, deleteTrabajoAnillado } = useData()
  const { user } = useAuth()
  const { addToast: toast } = useToast()

  // filters
  const [search, setSearch]               = useState('')
  const [filterEstado, setFilterEstado]   = useState('')
  const [showEntregados, setShowEntregados] = useState(false)

  // modal
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem]   = useState(null)
  const [form, setForm]           = useState(EMPTY)
  const [errors, setErrors]       = useState({})
  const [saving, setSaving]       = useState(false)
  const [deleteId, setDeleteId]   = useState(null)
  const [deleting, setDeleting]   = useState(false)

  // expanded row
  const [expandedRow, setExpandedRow] = useState(null)

  // archivos
  const [archivos, setArchivos]           = useState({})
  const [loadingArchivos, setLoadingArchivos] = useState(true)
  const [uploadingTo, setUploadingTo]     = useState(null)
  const [deletingFile, setDeletingFile]   = useState(null)
  const fileInputRef = useRef(null)
  const pendingUploadTrabajo = useRef(null)

  // ── load all file metadata ──────────────────────────────────────────────────
  const loadArchivos = useCallback(async () => {
    try {
      const all = await db.archivosAnilladoStorage.getAll()
      const map = {}
      all.forEach(f => {
        if (!map[f.trabajoId]) map[f.trabajoId] = []
        map[f.trabajoId].push(f)
      })
      setArchivos(map)
    } catch {
      // non-critical
    } finally {
      setLoadingArchivos(false)
    }
  }, [])

  useEffect(() => { loadArchivos() }, [loadArchivos])

  // ── derived ─────────────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const t = todayStr()
    return {
      pendiente:  trabajosAnillado.filter(x => x.estado === 'pendiente').length,
      en_proceso: trabajosAnillado.filter(x => x.estado === 'en_proceso').length,
      listo:      trabajosAnillado.filter(x => x.estado === 'listo').length,
      vencidos:   trabajosAnillado.filter(x => x.estado !== 'entregado' && x.fechaEntrega < t).length,
    }
  }, [trabajosAnillado])

  const filtered = useMemo(() => {
    return trabajosAnillado.filter(x => {
      if (!showEntregados && x.estado === 'entregado') return false
      if (filterEstado && x.estado !== filterEstado) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          x.cliente.toLowerCase().includes(q) ||
          x.descripcion.toLowerCase().includes(q) ||
          (x.telefono && x.telefono.includes(q))
        )
      }
      return true
    })
  }, [trabajosAnillado, filterEstado, search, showEntregados])

  const hasFilters = search || filterEstado

  // ── trabajo CRUD ─────────────────────────────────────────────────────────────

  function openCreate() {
    setEditItem(null); setForm(EMPTY); setErrors({}); setShowModal(true)
  }

  function openEdit(item) {
    setEditItem(item)
    setForm({
      cliente: item.cliente, telefono: item.telefono || '',
      descripcion: item.descripcion, cantidad: item.cantidad,
      tipoAnillado: item.tipoAnillado, fechaEntrega: item.fechaEntrega,
      precio: item.precio !== null ? item.precio : '', estado: item.estado,
      notas: item.notas || '',
    })
    setErrors({}); setShowModal(true)
  }

  function validate() {
    const e = {}
    if (!form.cliente.trim()) e.cliente = 'Requerido'
    if (!form.descripcion.trim()) e.descripcion = 'Requerido'
    if (!form.cantidad || Number(form.cantidad) < 1) e.cantidad = 'Debe ser mayor a 0'
    if (!form.fechaEntrega) e.fechaEntrega = 'Requerido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        cantidad: parseInt(form.cantidad),
        precio: form.precio !== '' ? parseFloat(form.precio) : null,
        createdBy: user.name,
      }
      if (editItem) {
        await updateTrabajoAnillado(editItem.id, payload)
        toast('Trabajo actualizado', 'success')
      } else {
        const created = await createTrabajoAnillado(payload)
        toast('Trabajo creado', 'success')
        setExpandedRow(created.id)
      }
      setShowModal(false)
    } catch {
      toast('Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function quickEstado(item, estado) {
    try {
      await updateTrabajoAnillado(item.id, { estado })
      toast(`Actualizado a "${ESTADO_CFG[estado].label}"`, 'success')
    } catch {
      toast('Error al actualizar', 'error')
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteTrabajoAnillado(deleteId)
      toast('Trabajo eliminado', 'success')
      if (expandedRow === deleteId) setExpandedRow(null)
      setDeleteId(null)
    } catch {
      toast('Error al eliminar', 'error')
    } finally {
      setDeleting(false)
    }
  }

  // ── file management ───────────────────────────────────────────────────────────

  function triggerUpload(trabajoId) {
    pendingUploadTrabajo.current = trabajoId
    fileInputRef.current?.click()
  }

  async function handleFileChange(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    e.target.value = ''
    const trabajoId = pendingUploadTrabajo.current
    if (!trabajoId) return
    setUploadingTo(trabajoId)
    let successCount = 0
    for (const file of files) {
      try {
        const uploaded = await db.archivosAnilladoStorage.upload(trabajoId, file, user.name)
        setArchivos(prev => ({
          ...prev,
          [trabajoId]: [...(prev[trabajoId] || []), uploaded],
        }))
        successCount++
      } catch {
        toast(`Error al subir "${file.name}"`, 'error')
      }
    }
    if (successCount > 0) {
      toast(successCount === 1 ? 'Archivo subido' : `${successCount} archivos subidos`, 'success')
    }
    setUploadingTo(null)
  }

  async function downloadFile(file) {
    try {
      const res = await fetch(file.url)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.nombre
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast('Error al descargar el archivo', 'error')
    }
  }

  async function handleDeleteFile(file) {
    setDeletingFile(file.id)
    try {
      await db.archivosAnilladoStorage.delete(file.id, file.path)
      setArchivos(prev => ({
        ...prev,
        [file.trabajoId]: (prev[file.trabajoId] || []).filter(f => f.id !== file.id),
      }))
      toast('Archivo eliminado', 'success')
    } catch {
      toast('Error al eliminar el archivo', 'error')
    } finally {
      setDeletingFile(null)
    }
  }

  function toggleRow(id) {
    setExpandedRow(prev => (prev === id ? null : id))
  }

  // ─── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col min-h-0">

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
            <Paperclip size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Trabajos de Anillado</h1>
            <p className="text-xs text-gray-500">Encuadernación con fecha de entrega · clic en una fila para ver/subir archivos PDF</p>
          </div>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Plus size={16} />
          Nuevo trabajo
        </Button>
      </div>

      {/* KPIs */}
      <div className="px-6 py-3 bg-white border-b border-gray-200 grid grid-cols-4 gap-3">
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">Pendientes</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{kpis.pendiente}</p>
          </div>
          <Clock size={20} className="text-gray-300" />
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-blue-600">En proceso</p>
            <p className="text-2xl font-bold text-blue-900 mt-0.5">{kpis.en_proceso}</p>
          </div>
          <Clock size={20} className="text-blue-300" />
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-green-600">Listos p/ retirar</p>
            <p className="text-2xl font-bold text-green-900 mt-0.5">{kpis.listo}</p>
          </div>
          <CheckCircle size={20} className="text-green-300" />
        </div>
        <div className={`border rounded-xl px-4 py-3 flex items-center justify-between ${kpis.vencidos > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
          <div>
            <p className={`text-xs font-medium ${kpis.vencidos > 0 ? 'text-red-600' : 'text-gray-500'}`}>Vencidos</p>
            <p className={`text-2xl font-bold mt-0.5 ${kpis.vencidos > 0 ? 'text-red-900' : 'text-gray-400'}`}>{kpis.vencidos}</p>
          </div>
          <AlertCircle size={20} className={kpis.vencidos > 0 ? 'text-red-300' : 'text-gray-200'} />
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar cliente, descripción..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={filterEstado}
          onChange={e => setFilterEstado(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="en_proceso">En proceso</option>
          <option value="listo">Listo para retirar</option>
          <option value="entregado">Entregado</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showEntregados}
            onChange={e => setShowEntregados(e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          Mostrar entregados
        </label>
        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setFilterEstado('') }}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <X size={14} /> Limpiar
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Paperclip size={44} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium text-gray-500">
              {hasFilters ? 'Sin resultados para los filtros aplicados' : 'No hay trabajos de anillado'}
            </p>
            {!hasFilters && (
              <p className="text-xs text-gray-400 mt-1">Hacé click en "Nuevo trabajo" para agregar el primero.</p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripción</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Tipo</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Cant.</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Entrega</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Precio</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-40">Estado</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Archivos</th>
                  <th className="w-20 px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const urgency = getUrgency(item)
                  const baseRow = URGENCY_ROW[urgency] || ''
                  const estadoCfg = ESTADO_CFG[item.estado]
                  const isExpanded = expandedRow === item.id
                  const itemFiles = archivos[item.id] || []
                  const isUploading = uploadingTo === item.id

                  return (
                    <React.Fragment key={item.id}>
                      {/* Main row */}
                      <tr
                        className={`group border-b border-gray-50 transition-colors cursor-pointer ${isExpanded ? 'bg-violet-50' : baseRow || 'hover:bg-gray-50'}`}
                        onClick={() => toggleRow(item.id)}
                      >
                        <td className="px-5 py-3">
                          <div className="font-semibold text-gray-900">{item.cliente}</div>
                          {item.telefono && <div className="text-xs text-gray-400 mt-0.5">{item.telefono}</div>}
                        </td>
                        <td className="px-5 py-3 text-gray-700">
                          <div className="max-w-xs">{item.descripcion}</div>
                          {item.notas && <div className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{item.notas}</div>}
                        </td>
                        <td className="px-5 py-3 text-gray-600 text-xs">{TIPO_CFG[item.tipoAnillado]}</td>
                        <td className="px-5 py-3 text-right font-medium text-gray-700">{item.cantidad}</td>
                        <td className="px-5 py-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-gray-700 text-xs font-medium">{shortDate(item.fechaEntrega)}</span>
                            {urgency && (
                              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded w-fit ${URGENCY_BADGE[urgency].cls}`}>
                                {URGENCY_BADGE[urgency].label}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right text-gray-700">
                          {item.precio !== null ? formatARS(item.precio) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                          <select
                            value={item.estado}
                            onChange={e => quickEstado(item, e.target.value)}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer border-0 appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500 ${estadoCfg.cls}`}
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="en_proceso">En proceso</option>
                            <option value="listo">Listo para retirar</option>
                            <option value="entregado">Entregado</option>
                          </select>
                        </td>
                        <td className="px-5 py-3">
                          {loadingArchivos
                            ? <span className="text-gray-300 text-xs">...</span>
                            : itemFiles.length > 0
                              ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">
                                  <FileText size={11} />
                                  {itemFiles.length}
                                </span>
                              )
                              : <span className="text-gray-300 text-xs">—</span>
                          }
                        </td>
                        <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                            <button
                              onClick={() => openEdit(item)}
                              className="p-1.5 rounded-lg hover:bg-white/80 text-gray-500 hover:text-gray-700 transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteId(item.id)}
                              className="p-1.5 rounded-lg hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded: files panel */}
                      {isExpanded && (
                        <tr className="bg-violet-50 border-b border-violet-100">
                          <td colSpan={9} className="px-6 py-4">
                            <div className="flex items-start justify-between gap-4">
                              {/* File list */}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-2.5">
                                  Archivos PDF
                                </p>
                                {itemFiles.length === 0 ? (
                                  <p className="text-sm text-gray-400 italic">
                                    Sin archivos. Subí el PDF del trabajo para tenerlo a mano.
                                  </p>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {itemFiles.map(file => (
                                      <div
                                        key={file.id}
                                        className="flex items-center gap-2 bg-white border border-violet-200 rounded-lg px-3 py-2 shadow-sm min-w-0 max-w-xs"
                                      >
                                        <FileText size={16} className="text-violet-400 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium text-gray-800 truncate" title={file.nombre}>
                                            {file.nombre}
                                          </p>
                                          {file.size && (
                                            <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
                                          )}
                                        </div>
                                        <a
                                          href={file.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1 rounded hover:bg-violet-100 text-violet-500 hover:text-violet-700 transition-colors shrink-0"
                                          title="Abrir PDF"
                                          onClick={e => e.stopPropagation()}
                                        >
                                          <ExternalLink size={13} />
                                        </a>
                                        <button
                                          onClick={e => { e.stopPropagation(); downloadFile(file) }}
                                          className="p-1 rounded hover:bg-violet-100 text-violet-500 hover:text-violet-700 transition-colors shrink-0"
                                          title="Descargar PDF"
                                        >
                                          <Download size={13} />
                                        </button>
                                        <button
                                          disabled={deletingFile === file.id}
                                          onClick={e => { e.stopPropagation(); handleDeleteFile(file) }}
                                          className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors shrink-0 disabled:opacity-40"
                                          title="Eliminar archivo"
                                        >
                                          {deletingFile === file.id
                                            ? <Loader2 size={13} className="animate-spin" />
                                            : <Trash2 size={13} />
                                          }
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Upload button */}
                              <div className="shrink-0">
                                <button
                                  disabled={isUploading}
                                  onClick={e => { e.stopPropagation(); triggerUpload(item.id) }}
                                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-violet-700 bg-white border border-violet-300 rounded-lg hover:bg-violet-50 transition-colors disabled:opacity-50 shadow-sm"
                                >
                                  {isUploading
                                    ? <Loader2 size={15} className="animate-spin" />
                                    : <Upload size={15} />
                                  }
                                  {isUploading ? 'Subiendo...' : 'Subir PDF'}
                                </button>
                                <p className="text-xs text-gray-400 mt-1.5 text-center">Múltiples archivos</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? 'Editar trabajo de anillado' : 'Nuevo trabajo de anillado'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Cliente *"
              value={form.cliente}
              onChange={e => setForm(p => ({ ...p, cliente: e.target.value }))}
              error={errors.cliente}
              placeholder="Nombre del cliente"
            />
            <Input
              label="Teléfono"
              value={form.telefono}
              onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))}
              placeholder="Opcional"
            />
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
              <textarea
                value={form.descripcion}
                onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                rows={2}
                placeholder="Qué hay que anillar..."
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none ${errors.descripcion ? 'border-red-400' : 'border-gray-300'}`}
              />
              {errors.descripcion && <p className="mt-1 text-xs text-red-600">{errors.descripcion}</p>}
            </div>
            <Input
              label="Cantidad *"
              type="number" min="1"
              value={form.cantidad}
              onChange={e => setForm(p => ({ ...p, cantidad: e.target.value }))}
              error={errors.cantidad}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de anillado</label>
              <select
                value={form.tipoAnillado}
                onChange={e => setForm(p => ({ ...p, tipoAnillado: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="espiral">Espiral</option>
                <option value="tapa_dura">Tapa dura</option>
                <option value="rustica">Rústica</option>
              </select>
            </div>
            <Input
              label="Fecha de entrega *"
              type="date"
              value={form.fechaEntrega}
              onChange={e => setForm(p => ({ ...p, fechaEntrega: e.target.value }))}
              error={errors.fechaEntrega}
            />
            <Input
              label="Precio ($)"
              type="number" min="0" step="0.01"
              value={form.precio}
              onChange={e => setForm(p => ({ ...p, precio: e.target.value }))}
              placeholder="Opcional"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={form.estado}
                onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="pendiente">Pendiente</option>
                <option value="en_proceso">En proceso</option>
                <option value="listo">Listo para retirar</option>
                <option value="entregado">Entregado</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas internas</label>
              <textarea
                value={form.notas}
                onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
                rows={2}
                placeholder="Notas adicionales (opcional)..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>
          </div>
          {!editItem && (
            <p className="text-xs text-violet-600 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">
              Una vez creado el trabajo podés subir los PDFs directamente desde la lista.
            </p>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : editItem ? 'Guardar cambios' : 'Crear trabajo'}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} title="Eliminar trabajo" size="sm">
        <p className="text-sm text-gray-600">¿Eliminás este trabajo? También se borrarán todos sus archivos adjuntos.</p>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
