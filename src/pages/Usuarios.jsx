import React, { useState } from 'react'
import { Plus, Pencil, Trash2, User, Shield, Loader2 } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { formatDate } from '../utils/dateUtils'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'

const EMPTY_FORM = { name: '', email: '', password: '', role: 'Empleado' }

export default function Usuarios() {
  const { users, createUser, updateUser, deleteUser } = useData()
  const { user: authUser, refreshUser } = useAuth()
  const { addToast } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setShowPass(false)
    setModalOpen(true)
  }

  function openEdit(u) {
    setEditTarget(u)
    setForm({ name: u.name, email: u.email, password: '', role: u.role })
    setErrors({})
    setShowPass(false)
    setModalOpen(true)
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'El nombre es obligatorio'
    if (!form.email.trim()) e.email = 'El usuario (login) es obligatorio'
    if (!editTarget && users.some((u) => u.email.toLowerCase() === form.email.trim().toLowerCase()))
      e.email = 'Ya existe un usuario con ese login'
    if (!editTarget && !form.password) e.password = 'La contraseña es obligatoria'
    if (form.password && form.password.length < 4) e.password = 'Mínimo 4 caracteres'
    return e
  }

  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    const data = { name: form.name.trim(), email: form.email.trim(), role: form.role }
    if (form.password) data.password = form.password
    setSaving(true)
    try {
      if (editTarget) {
        await updateUser(editTarget.id, data)
        if (editTarget.id === authUser.id) await refreshUser()
        addToast('Usuario actualizado', 'success')
      } else {
        await createUser(data)
        addToast('Usuario creado', 'success')
      }
      setModalOpen(false)
    } catch {
      addToast('Error al guardar. Revisá la conexión.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteUser(deleteTarget.id)
      addToast('Usuario eliminado', 'info')
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
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} usuarios registrados</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Nuevo usuario
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {['Usuario', 'Login', 'Rol', 'Registrado', 'Acciones'].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => {
              const isSelf = u.id === authUser?.id
              return (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                        {u.role === 'Admin' ? <Shield size={16} className="text-primary-600" /> : <User size={16} className="text-primary-600" />}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {u.name}
                          {isSelf && <span className="ml-2 text-xs text-primary-600 font-normal">(vos)</span>}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-600 font-mono text-xs">{u.email}</td>
                  <td className="px-5 py-4"><Badge variant={u.role === 'Admin' ? 'admin' : 'empleado'}>{u.role}</Badge></td>
                  <td className="px-5 py-4 text-gray-500 text-xs">{formatDate(u.createdAt)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(u)} className="p-1.5 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors" title="Editar">
                        <Pencil size={14} />
                      </button>
                      {!isSelf && (
                        <button onClick={() => setDeleteTarget(u)} className="p-1.5 bg-danger-50 text-danger-600 hover:bg-danger-100 rounded-lg transition-colors" title="Eliminar">
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Editar usuario' : 'Nuevo usuario'} size="sm">
        <div className="flex flex-col gap-4">
          <Input label="Nombre completo" placeholder="Ej: María García" value={form.name} onChange={set('name')} error={errors.name} autoFocus />
          <Input label="Usuario (login)" placeholder="Ej: maria" value={form.email} onChange={set('email')} error={errors.email} disabled={!!editTarget} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              {editTarget ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
            </label>
            <div className="relative flex items-center">
              <input
                type={showPass ? 'text' : 'password'}
                placeholder={editTarget ? 'Nueva contraseña...' : 'Mínimo 4 caracteres'}
                value={form.password}
                onChange={set('password')}
                className={`w-full rounded-lg border py-2.5 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 ${errors.password ? 'border-danger-500 focus:ring-danger-500/20' : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20'}`}
              />
              <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
            {errors.password && <p className="text-xs text-danger-600">{errors.password}</p>}
          </div>
          <Select label="Rol" value={form.role} onChange={set('role')}>
            <option value="Admin">Admin</option>
            <option value="Empleado">Empleado</option>
          </Select>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="flex-1" disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} className="flex-1" disabled={saving}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : editTarget ? 'Guardar' : 'Crear usuario'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Eliminar usuario" size="sm">
        <p className="text-gray-600 mb-6">¿Eliminar al usuario <strong>{deleteTarget?.name}</strong>? Esta acción no se puede deshacer.</p>
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
