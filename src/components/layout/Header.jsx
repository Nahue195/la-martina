import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, LogOut, ChevronDown, Shield } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function Header() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header
      className="h-14 flex items-center justify-between px-6 shrink-0"
      style={{
        background: '#ffffff',
        borderBottom: '1px solid #ece9e3',
      }}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-sm font-medium" style={{ color: '#9ca3af' }}>
          Sistema de Caja
        </span>
        {isAdmin && (
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(249,115,22,0.10)',
              color: '#ea580c',
            }}
          >
            <Shield size={10} />
            Admin
          </span>
        )}
      </div>

      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-colors text-sm font-medium"
          style={{
            color: '#374151',
            background: open ? '#f3f4f6' : 'transparent',
          }}
          onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = '#f9fafb' }}
          onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'transparent' }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: 'rgba(249,115,22,0.12)', color: '#ea580c' }}
          >
            {user?.name?.charAt(0)?.toUpperCase() || <User size={14} />}
          </div>
          <span className="font-medium text-sm">{user?.name}</span>
          <ChevronDown
            size={14}
            className={`transition-transform duration-200`}
            style={{ color: '#9ca3af', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </button>

        {open && (
          <div
            className="absolute right-0 top-full mt-2 w-48 rounded-xl py-1 z-30"
            style={{
              background: '#ffffff',
              border: '1px solid #ece9e3',
              boxShadow: '0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)',
            }}
          >
            <div
              className="px-4 py-2.5"
              style={{ borderBottom: '1px solid #f3f4f6' }}
            >
              <p className="text-xs font-semibold text-gray-900">{user?.name}</p>
              <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors"
              style={{ color: '#dc2626' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <LogOut size={14} />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
