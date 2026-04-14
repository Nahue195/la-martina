import React, { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import Modal from './ui/Modal'
import Button from './ui/Button'
import Input from './ui/Input'
import Select from './ui/Select'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { minutesAgo } from '../utils/dateUtils'

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'Efectivo' },
  { value: 'QRTransfer', label: 'QR/Transferencia' },
  { value: 'Card', label: 'Tarjeta' },
]

const EMPTY_FORM = {
  type: 'Ingreso',
  amount: '',
  paymentMethod: 'Cash',
  categoryId: '',
  note: '',
}

export default function MovementModal({ isOpen, onClose, movement = null }) {
  const { categories, createMovement, updateMovement } = useData()
  const { user, isAdmin } = useAuth()
  const { addToast } = useToast()

  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const isEdit = !!movement
  const filteredCats = categories.filter((c) => c.type === form.type && c.active)

  useEffect(() => {
    if (!isOpen) return
    if (movement) {
      setForm({
        type: movement.type,
        amount: String(movement.amount),
        paymentMethod: movement.paymentMethod,
        categoryId: movement.categoryId,
        note: movement.note || '',
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setErrors({})
    setSaving(false)
  }, [isOpen, movement])

  // Auto-select first category when type changes
  useEffect(() => {
    const cats = categories.filter((c) => c.type === form.type && c.active)
    if (cats.length && !cats.find((c) => c.id === form.categoryId)) {
      setForm((f) => ({ ...f, categoryId: cats[0]?.id || '' }))
    }
  }, [form.type, categories])

  function validate() {
    const e = {}
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0)
      e.amount = 'Ingresá un monto válido mayor a 0'
    if (!form.categoryId) e.categoryId = 'Seleccioná una categoría'
    if (!form.paymentMethod) e.paymentMethod = 'Seleccioná un método de pago'
    return e
  }

  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    const data = {
      type: form.type,
      amount: parseFloat(form.amount),
      paymentMethod: form.paymentMethod,
      categoryId: form.categoryId,
      note: form.note.trim(),
    }

    setSaving(true)
    try {
      if (isEdit) {
        await updateMovement(movement.id, data)
        addToast('Movimiento actualizado correctamente', 'success')
      } else {
        await createMovement({ ...data, createdBy: user.id })
        addToast('Movimiento registrado correctamente', 'success')
      }
      onClose()
    } catch {
      addToast('Error al guardar. Revisá la conexión.', 'error')
    } finally {
      setSaving(false)
    }
  }

  function set(field) {
    return (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value }))
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const canEdit = isAdmin || (isEdit && minutesAgo(movement?.createdAt) <= 10)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Editar movimiento' : 'Nuevo movimiento'}>
      <div className="flex flex-col gap-5">
        {/* Type toggle */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Tipo</label>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            {['Ingreso', 'Egreso'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setForm((f) => ({ ...f, type: t, categoryId: '' })); setErrors((p) => ({ ...p, categoryId: '' })) }}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                  form.type === t
                    ? t === 'Ingreso' ? 'bg-success-600 text-white' : 'bg-danger-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

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

        <Select label="Método de pago" value={form.paymentMethod} onChange={set('paymentMethod')} error={errors.paymentMethod}>
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </Select>

        <Select label="Categoría" value={form.categoryId} onChange={set('categoryId')} error={errors.categoryId}>
          <option value="">Seleccioná una categoría</option>
          {filteredCats.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Nota <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <textarea
            rows={3}
            placeholder="Descripción adicional..."
            value={form.note}
            onChange={set('note')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 resize-none focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <Button variant="secondary" onClick={onClose} className="flex-1" disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant={form.type === 'Ingreso' ? 'success' : 'danger'}
            onClick={handleSave}
            disabled={(isEdit && !canEdit) || saving}
            className="flex-1"
          >
            {saving ? (
              <><Loader2 size={15} className="animate-spin" /> Guardando...</>
            ) : isEdit ? 'Guardar cambios' : `Registrar ${form.type}`}
          </Button>
        </div>

        {isEdit && !canEdit && (
          <p className="text-xs text-gray-500 text-center -mt-2">
            Solo podés editar movimientos dentro de los 10 minutos de creación.
          </p>
        )}
      </div>
    </Modal>
  )
}
