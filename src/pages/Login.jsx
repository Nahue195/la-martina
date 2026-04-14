import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Printer, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.email.trim() || !form.password) {
      setError('Completá usuario y contraseña')
      return
    }
    setLoading(true)
    const result = await login(form.email.trim(), form.password)
    setLoading(false)
    if (result.success) {
      navigate('/')
    } else {
      setError(result.error)
    }
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: '#f7f6f3' }}
    >
      {/* Left decorative panel */}
      <div
        className="hidden lg:flex w-80 flex-col justify-between p-10 shrink-0"
        style={{
          background: 'linear-gradient(170deg, #0f172a 0%, #1e1035 100%)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}
          >
            <Printer size={17} className="text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-bold">La Martina</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Fotocopiadora</p>
          </div>
        </div>

        <div>
          <p
            className="text-4xl font-bold leading-tight"
            style={{ color: 'rgba(255,255,255,0.92)' }}
          >
            Sistema<br />de Caja
          </p>
          <p className="mt-3 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Control de ingresos, egresos y balance por método de pago.
          </p>
        </div>

        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Solo personal autorizado
        </p>
      </div>

      {/* Right: login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div
          className="w-full max-w-sm rounded-2xl p-8"
          style={{
            background: '#ffffff',
            border: '1px solid #ece9e3',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          }}
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden flex-col items-center gap-2 mb-8">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}
            >
              <Printer size={22} className="text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900">La Martina</h1>
              <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>Sistema de Caja</p>
            </div>
          </div>

          <div className="mb-7">
            <h2 className="text-xl font-bold text-gray-900">Ingresar</h2>
            <p className="text-sm mt-0.5" style={{ color: '#9ca3af' }}>Ingresá tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Usuario"
              type="text"
              placeholder="Ej: admin"
              value={form.email}
              onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value })); setError('') }}
              autoComplete="username"
              autoFocus
              disabled={loading}
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Contraseña</label>
              <div className="relative flex items-center">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => { setForm((f) => ({ ...f, password: e.target.value })); setError('') }}
                  autoComplete="current-password"
                  disabled={loading}
                  className={`w-full rounded-lg border py-2.5 pl-3 pr-10 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 disabled:bg-gray-50 ${
                    error
                      ? 'border-danger-400 focus:border-danger-500 focus:ring-danger-500/20'
                      : 'border-gray-200 focus:border-primary-400 focus:ring-primary-500/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p
                className="text-sm rounded-xl px-3 py-2.5"
                style={{
                  color: '#b91c1c',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                }}
              >
                {error}
              </p>
            )}

            <Button type="submit" className="w-full justify-center mt-1" disabled={loading}>
              {loading ? (
                <><Loader2 size={15} className="animate-spin" /> Verificando...</>
              ) : (
                'Entrar al sistema'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
