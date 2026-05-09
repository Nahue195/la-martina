import React, { useState } from 'react'
import { Plus, Pencil, Trash2, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'

const EMPTY_FORM = { type: 'Ingreso', name: '', active: true }

export default function Categorias() {
  const { categories, createCategory, updateCategory, deleteCategory } = useData()
  const { addToast } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [filterType, setFilterType] = useState('')

  const displayed = filterType ? categories.filter((c) => c.type === filterType) : categories

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setModalOpen(true)
  }

  function openEdit(cat) {
    setEditTarget(cat)
    setForm({ type: cat.type, name: cat.name, active: cat.active })
    setErrors({})
    setModalOpen(true)
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'El nombre es obligatorio'
    if (!editTarget && categories.some((c) => c.name.toLowerCase() === form.name.trim().toLowerCase() && c.type === form.type))
      e.name = 'Ya existe una categoría con ese nombre y tipo'
    return e
  }

  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    const data = { type: form.type, name: form.name.trim(), active: form.active }
    setSaving(true)
    try {
      if (editTarget) {
        await updateCategory(editTarget.id, data)
        addToast('Categoría actualizada', 'success')
      } else {
        await createCategory(data)
        addToast('Categoría creada', 'success')
      }
      setModalOpen(false)
    } catch {
      addToast('Error al guardar. Revisá la conexión.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(cat) {
    try {
      await updateCategory(cat.id, { active: !cat.active })
      addToast(`Categoría ${cat.active ? 'desactivada' : 'activada'}`, 'info')
    } catch {
      addToast('Error al actualizar', 'error')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteCategory(deleteTarget.id)
      addToast('Categoría eliminada', 'info')
    } catch {
      addToast('Error al eliminar', 'error')
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const ingresos = displayed.filter((c) => c.type === 'Ingreso')
  const egresos = displayed.filter((c) => c.type === 'Egreso')

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorías</h1>
          <p className="text-sm text-gray-500 mt-0.5">{categories.length} categorías en total</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Nueva categoría
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 font-medium">Filtrar:</span>
        {[{ key: '', label: 'Todas' }, { key: 'Ingreso', label: 'Ingresos' }, { key: 'Egreso', label: 'Egresos' }].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterType(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
              filterType === f.key
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5">
        {(!filterType || filterType === 'Ingreso') && (
          <CategoryTable title="Ingresos" variant="ingreso" items={ingresos} onEdit={openEdit} onDelete={setDeleteTarget} onToggle={handleToggleActive} />
        )}
        {(!filterType || filterType === 'Egreso') && (
          <CategoryTable title="Egresos" variant="egreso" items={egresos} onEdit={openEdit} onDelete={setDeleteTarget} onToggle={handleToggleActive} />
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Editar categoría' : 'Nueva categoría'} size="sm">
        <div className="flex flex-col gap-4">
          <Select label="Tipo" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} disabled={!!editTarget}>
            <option value="Ingreso">Ingreso</option>
            <option value="Egreso">Egreso</option>
          </Select>
          <Input
            label="Nombre"
            placeholder="Ej: Fotocopias"
            value={form.name}
            onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setErrors((p) => ({ ...p, name: '' })) }}
            error={errors.name}
            autoFocus
          />
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-medium text-gray-700">Estado</span>
            <button type="button" onClick={() => setForm((f) => ({ ...f, active: !f.active }))} className="flex items-center gap-2 text-sm">
              {form.active
                ? <><ToggleRight size={22} className="text-success-600" /><span className="text-success-700 font-medium">Activa</span></>
                : <><ToggleLeft size={22} className="text-gray-400" /><span className="text-gray-500 font-medium">Inactiva</span></>}
            </button>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1" disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} className="flex-1" disabled={saving}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : editTarget ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Eliminar categoría" size="sm">
        <p className="text-gray-600 mb-6">¿Eliminar la categoría <strong>{deleteTarget?.name}</strong>? Los movimientos existentes no se verán afectados.</p>
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

function CategoryTable({ title, variant, items, onEdit, onDelete, onToggle }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
        <Badge variant={variant}>{title}</Badge>
        <span className="text-sm text-gray-400">({items.length})</span>
      </div>
      {items.length === 0 ? (
        <div className="py-10 text-center text-gray-400 text-sm">Sin categorías</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((cat) => (
              <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-800">{cat.name}</td>
                <td className="px-4 py-3">
                  <button onClick={() => onToggle(cat)} className="hover:opacity-80 transition-opacity">
                    <Badge variant={cat.active ? 'active' : 'inactive'}>{cat.active ? 'Activa' : 'Inactiva'}</Badge>
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => onEdit(cat)} className="p-1.5 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors" title="Editar">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => onDelete(cat)} className="p-1.5 bg-danger-50 text-danger-600 hover:bg-danger-100 rounded-lg transition-colors" title="Eliminar">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
