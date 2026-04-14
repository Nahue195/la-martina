import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  GraduationCap, Plus, Search, X, Edit2, Trash2,
  ChevronDown, ChevronRight, FileText, Upload, ExternalLink, Download, Loader2,
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
  pendiente:  { label: 'Pendiente',  cls: 'bg-amber-100 text-amber-800' },
  parcial:    { label: 'Parcial',    cls: 'bg-blue-100 text-blue-800' },
  completado: { label: 'Completado', cls: 'bg-green-100 text-green-800' },
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

const EMPTY = {
  escuela: '', grado: '', materia: '', profesor: '', descripcion: '',
  cantidadCopias: 1, cantidadAlumnos: '', precioPorCopia: 0,
  estado: 'pendiente', fechaIngreso: new Date().toISOString().split('T')[0],
}

// ─── component ────────────────────────────────────────────────────────────────

export default function TrabajosColegio() {
  const { trabajosColegio, createTrabajoColegio, updateTrabajoColegio, deleteTrabajoColegio } = useData()
  const { user } = useAuth()
  const { addToast: toast } = useToast()

  // filters / ui state
  const [search, setSearch]             = useState('')
  const [filterEscuela, setFilterEscuela] = useState('')
  const [filterEstado, setFilterEstado]   = useState('')
  const [collapsedSchools, setCollapsedSchools] = useState({})
  const [expandedRow, setExpandedRow]   = useState(null)

  // modal state
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem]   = useState(null)
  const [form, setForm]           = useState(EMPTY)
  const [errors, setErrors]       = useState({})
  const [saving, setSaving]       = useState(false)
  const [deleteId, setDeleteId]   = useState(null)
  const [deleting, setDeleting]   = useState(false)

  // archivos state: { [trabajoId]: File[] } — loaded eagerly
  const [archivos, setArchivos]       = useState({})
  const [loadingArchivos, setLoadingArchivos] = useState(true)
  const [uploadingTo, setUploadingTo] = useState(null) // trabajoId being uploaded
  const [deletingFile, setDeletingFile] = useState(null) // fileId being deleted
  const fileInputRef = useRef(null)
  const pendingUploadTrabajo = useRef(null)

  // ── load all file metadata once (and when trabajosColegio changes) ──────────
  const loadArchivos = useCallback(async () => {
    try {
      const all = await db.archivosColegioStorage.getAll()
      const map = {}
      all.forEach(f => {
        if (!map[f.trabajoId]) map[f.trabajoId] = []
        map[f.trabajoId].push(f)
      })
      setArchivos(map)
    } catch {
      // silently ignore — non-critical
    } finally {
      setLoadingArchivos(false)
    }
  }, [])

  useEffect(() => { loadArchivos() }, [loadArchivos])

  // ── derived data ─────────────────────────────────────────────────────────────

  const escuelas = useMemo(() =>
    [...new Set(trabajosColegio.map(t => t.escuela))].sort(),
    [trabajosColegio]
  )

  const filtered = useMemo(() => {
    return trabajosColegio.filter(t => {
      if (filterEscuela && t.escuela !== filterEscuela) return false
      if (filterEstado && t.estado !== filterEstado) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          t.escuela.toLowerCase().includes(q) ||
          t.materia.toLowerCase().includes(q) ||
          t.grado.toLowerCase().includes(q) ||
          (t.profesor && t.profesor.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [trabajosColegio, filterEscuela, filterEstado, search])

  const groups = useMemo(() => {
    const map = {}
    filtered.forEach(t => {
      if (!map[t.escuela]) map[t.escuela] = []
      map[t.escuela].push(t)
    })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const kpis = useMemo(() => ({
    pendiente:  trabajosColegio.filter(t => t.estado === 'pendiente').length,
    parcial:    trabajosColegio.filter(t => t.estado === 'parcial').length,
    completado: trabajosColegio.filter(t => t.estado === 'completado').length,
  }), [trabajosColegio])

  const hasFilters = search || filterEscuela || filterEstado

  // ── trabajo CRUD ─────────────────────────────────────────────────────────────

  function openCreate() {
    setEditItem(null); setForm(EMPTY); setErrors({}); setShowModal(true)
  }

  function openEdit(item) {
    setEditItem(item)
    setForm({
      escuela: item.escuela, grado: item.grado, materia: item.materia,
      profesor: item.profesor || '', descripcion: item.descripcion || '',
      cantidadCopias: item.cantidadCopias, cantidadAlumnos: item.cantidadAlumnos || '',
      precioPorCopia: item.precioPorCopia, estado: item.estado, fechaIngreso: item.fechaIngreso,
    })
    setErrors({}); setShowModal(true)
  }

  function validate() {
    const e = {}
    if (!form.escuela.trim()) e.escuela = 'Requerido'
    if (!form.grado.trim()) e.grado = 'Requerido'
    if (!form.materia.trim()) e.materia = 'Requerido'
    if (!form.cantidadCopias || Number(form.cantidadCopias) < 1) e.cantidadCopias = 'Debe ser mayor a 0'
    if (!form.fechaIngreso) e.fechaIngreso = 'Requerido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        cantidadCopias: parseInt(form.cantidadCopias),
        cantidadAlumnos: form.cantidadAlumnos ? parseInt(form.cantidadAlumnos) : null,
        precioPorCopia: parseFloat(form.precioPorCopia) || 0,
        createdBy: user.name,
      }
      if (editItem) {
        await updateTrabajoColegio(editItem.id, payload)
        toast('Trabajo actualizado', 'success')
      } else {
        const created = await createTrabajoColegio(payload)
        toast('Trabajo creado', 'success')
        // auto-expand the new row so user can upload right away
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
      await updateTrabajoColegio(item.id, { estado })
      toast(`Actualizado a "${ESTADO_CFG[estado].label}"`, 'success')
    } catch {
      toast('Error al actualizar', 'error')
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteTrabajoColegio(deleteId)
      toast('Trabajo eliminado', 'success')
      setDeleteId(null)
      if (expandedRow === deleteId) setExpandedRow(null)
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
    e.target.value = '' // reset so same file can be re-selected

    const trabajoId = pendingUploadTrabajo.current
    if (!trabajoId) return

    setUploadingTo(trabajoId)
    let successCount = 0
    for (const file of files) {
      try {
        const uploaded = await db.archivosColegioStorage.upload(trabajoId, file, user.name)
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
      toast(
        successCount === 1 ? 'Archivo subido' : `${successCount} archivos subidos`,
        'success'
      )
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
      await db.archivosColegioStorage.delete(file.id, file.path)
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

  function toggleSchool(escuela) {
    setCollapsedSchools(prev => ({ ...prev, [escuela]: !prev[escuela] }))
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
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
            <GraduationCap size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Trabajos de Colegios</h1>
            <p className="text-xs text-gray-500">Fotocopias dejadas por profesores · clic en una fila para ver/subir archivos PDF</p>
          </div>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Plus size={16} />
          Nuevo trabajo
        </Button>
      </div>

      {/* KPIs */}
      <div className="px-6 py-3 bg-white border-b border-gray-200 grid grid-cols-3 gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-sm font-medium text-amber-700">Pendientes</p>
          <p className="text-2xl font-bold text-amber-900">{kpis.pendiente}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-sm font-medium text-blue-700">Parciales</p>
          <p className="text-2xl font-bold text-blue-900">{kpis.parcial}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-sm font-medium text-green-700">Completados</p>
          <p className="text-2xl font-bold text-green-900">{kpis.completado}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar escuela, materia, grado, profesor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={filterEscuela}
          onChange={e => setFilterEscuela(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Todas las escuelas</option>
          {escuelas.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select
          value={filterEstado}
          onChange={e => setFilterEstado(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="parcial">Parcial</option>
          <option value="completado">Completado</option>
        </select>
        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setFilterEscuela(''); setFilterEstado('') }}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <X size={14} /> Limpiar
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {groups.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <GraduationCap size={44} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium text-gray-500">
              {hasFilters ? 'Sin resultados para los filtros aplicados' : 'No hay trabajos cargados'}
            </p>
            {!hasFilters && (
              <p className="text-xs text-gray-400 mt-1">Hacé click en "Nuevo trabajo" para agregar el primero.</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map(([escuela, items]) => {
              const pend = items.filter(t => t.estado === 'pendiente').length
              const parc = items.filter(t => t.estado === 'parcial').length
              const isSchoolCollapsed = collapsedSchools[escuela]

              return (
                <div key={escuela} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">

                  {/* School header */}
                  <button
                    onClick={() => toggleSchool(escuela)}
                    className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors border-b border-gray-200"
                  >
                    <div className="flex items-center gap-2.5">
                      {isSchoolCollapsed
                        ? <ChevronRight size={16} className="text-gray-400 shrink-0" />
                        : <ChevronDown size={16} className="text-gray-400 shrink-0" />
                      }
                      <span className="font-bold text-gray-900 text-sm">{escuela}</span>
                      <span className="text-xs text-gray-400">
                        {items.length} {items.length === 1 ? 'trabajo' : 'trabajos'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {pend > 0 && (
                        <span className="text-xs font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                          {pend} pendiente{pend > 1 ? 's' : ''}
                        </span>
                      )}
                      {parc > 0 && (
                        <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                          {parc} parcial{parc > 1 ? 'es' : ''}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Items table */}
                  {!isSchoolCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 bg-white">
                            <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Grado</th>
                            <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Materia</th>
                            <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Profesor</th>
                            <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Copias</th>
                            <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Precio/u</th>
                            <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Estado</th>
                            <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Fecha</th>
                            <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Archivos</th>
                            <th className="w-20 px-5 py-2.5"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map(item => {
                            const cfg = ESTADO_CFG[item.estado]
                            const isExpanded = expandedRow === item.id
                            const itemFiles = archivos[item.id] || []
                            const isUploading = uploadingTo === item.id

                            return (
                              <React.Fragment key={item.id}>
                                {/* Main row */}
                                <tr
                                  className={`group border-b border-gray-50 transition-colors cursor-pointer ${isExpanded ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                                  onClick={() => toggleRow(item.id)}
                                >
                                  <td className="px-5 py-3 font-semibold text-gray-900">{item.grado}</td>
                                  <td className="px-5 py-3 text-gray-700">
                                    <div className="font-medium">{item.materia}</div>
                                    {item.descripcion && (
                                      <div className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{item.descripcion}</div>
                                    )}
                                  </td>
                                  <td className="px-5 py-3 text-gray-600">
                                    {item.profesor || <span className="text-gray-300">—</span>}
                                  </td>
                                  <td className="px-5 py-3 text-right text-gray-700">
                                    <span className="font-medium">{item.cantidadCopias}</span>
                                    {item.cantidadAlumnos && (
                                      <span className="text-xs text-gray-400 ml-1">({item.cantidadAlumnos} al.)</span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3 text-right text-gray-700">
                                    {item.precioPorCopia > 0
                                      ? formatARS(item.precioPorCopia)
                                      : <span className="text-gray-300">—</span>
                                    }
                                  </td>
                                  <td
                                    className="px-5 py-3"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <select
                                      value={item.estado}
                                      onChange={e => quickEstado(item, e.target.value)}
                                      className={`text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer border-0 appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500 ${cfg.cls}`}
                                    >
                                      <option value="pendiente">Pendiente</option>
                                      <option value="parcial">Parcial</option>
                                      <option value="completado">Completado</option>
                                    </select>
                                  </td>
                                  <td className="px-5 py-3 text-gray-500 text-xs">{shortDate(item.fechaIngreso)}</td>
                                  <td className="px-5 py-3">
                                    {loadingArchivos
                                      ? <span className="text-gray-300 text-xs">...</span>
                                      : itemFiles.length > 0
                                        ? (
                                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                                            <FileText size={11} />
                                            {itemFiles.length}
                                          </span>
                                        )
                                        : <span className="text-gray-300 text-xs">—</span>
                                    }
                                  </td>
                                  <td
                                    className="px-5 py-3"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                      <button
                                        onClick={() => openEdit(item)}
                                        className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
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
                                  <tr className="bg-indigo-50 border-b border-indigo-100">
                                    <td colSpan={9} className="px-6 py-4">
                                      <div className="flex items-start justify-between gap-4">
                                        {/* File list */}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-2.5">
                                            Archivos PDF
                                          </p>
                                          {itemFiles.length === 0 ? (
                                            <p className="text-sm text-gray-400 italic">
                                              Sin archivos. Subí el PDF de la materia para tenerlo listo.
                                            </p>
                                          ) : (
                                            <div className="flex flex-wrap gap-2">
                                              {itemFiles.map(file => (
                                                <div
                                                  key={file.id}
                                                  className="flex items-center gap-2 bg-white border border-indigo-200 rounded-lg px-3 py-2 shadow-sm min-w-0 max-w-xs"
                                                >
                                                  <FileText size={16} className="text-indigo-400 shrink-0" />
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
                                                    className="p-1 rounded hover:bg-indigo-100 text-indigo-500 hover:text-indigo-700 transition-colors shrink-0"
                                                    title="Abrir PDF"
                                                    onClick={e => e.stopPropagation()}
                                                  >
                                                    <ExternalLink size={13} />
                                                  </a>
                                                  <button
                                                    onClick={e => { e.stopPropagation(); downloadFile(file) }}
                                                    className="p-1 rounded hover:bg-indigo-100 text-indigo-500 hover:text-indigo-700 transition-colors shrink-0"
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
                                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-white border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50 shadow-sm"
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
              )
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? 'Editar trabajo de colegio' : 'Nuevo trabajo de colegio'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Escuela *</label>
              <input
                type="text"
                value={form.escuela}
                onChange={e => setForm(p => ({ ...p, escuela: e.target.value }))}
                list="escuelas-datalist"
                placeholder="Ej: INSR, EET N°4, Colegio San Martín..."
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.escuela ? 'border-red-400' : 'border-gray-300'}`}
              />
              <datalist id="escuelas-datalist">
                {escuelas.map(e => <option key={e} value={e} />)}
              </datalist>
              {errors.escuela && <p className="mt-1 text-xs text-red-600">{errors.escuela}</p>}
            </div>
            <Input
              label="Grado / División *"
              value={form.grado}
              onChange={e => setForm(p => ({ ...p, grado: e.target.value }))}
              error={errors.grado}
              placeholder="Ej: 3° B, 4to A, 1ero..."
            />
            <Input
              label="Materia *"
              value={form.materia}
              onChange={e => setForm(p => ({ ...p, materia: e.target.value }))}
              error={errors.materia}
              placeholder="Ej: Geografía, Historia..."
            />
            <Input
              label="Profesor/a"
              value={form.profesor}
              onChange={e => setForm(p => ({ ...p, profesor: e.target.value }))}
              placeholder="Nombre (opcional)"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={form.estado}
                onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="pendiente">Pendiente</option>
                <option value="parcial">Parcial</option>
                <option value="completado">Completado</option>
              </select>
            </div>
            <Input
              label="Cantidad de copias *"
              type="number" min="1"
              value={form.cantidadCopias}
              onChange={e => setForm(p => ({ ...p, cantidadCopias: e.target.value }))}
              error={errors.cantidadCopias}
            />
            <Input
              label="Cantidad de alumnos"
              type="number" min="1"
              value={form.cantidadAlumnos}
              onChange={e => setForm(p => ({ ...p, cantidadAlumnos: e.target.value }))}
              placeholder="Opcional"
            />
            <Input
              label="Precio por copia ($)"
              type="number" min="0" step="0.01"
              value={form.precioPorCopia}
              onChange={e => setForm(p => ({ ...p, precioPorCopia: e.target.value }))}
            />
            <Input
              label="Fecha de ingreso *"
              type="date"
              value={form.fechaIngreso}
              onChange={e => setForm(p => ({ ...p, fechaIngreso: e.target.value }))}
              error={errors.fechaIngreso}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción / Notas</label>
            <textarea
              value={form.descripcion}
              onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
              rows={2}
              placeholder="Detalles adicionales (opcional)..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
          {!editItem && (
            <p className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
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
