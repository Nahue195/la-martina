import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight, Tag, Users, BookOpen,
  Printer, BarChart2, Package, GraduationCap, Paperclip,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/movimientos', label: 'Movimientos', icon: ArrowLeftRight },
  { path: '/fiados', label: 'Fiados', icon: BookOpen },
  { path: '/analytics', label: 'Analytics', icon: BarChart2 },
  { path: '/productos', label: 'Productos', icon: Package },
  { path: '/trabajos-colegio', label: 'Colegios', icon: GraduationCap },
  { path: '/anillado', label: 'Anillado', icon: Paperclip },
  { path: '/categorias', label: 'Categorías', icon: Tag, adminOnly: true },
  { path: '/usuarios', label: 'Usuarios', icon: Users, adminOnly: true },
]

const ADMIN_ITEMS = navItems.filter((i) => i.adminOnly)
const MAIN_ITEMS = navItems.filter((i) => !i.adminOnly)

export default function Sidebar() {
  const { isAdmin } = useAuth()

  return (
    <aside
      className="w-60 flex flex-col shrink-0 relative"
      style={{
        background: 'linear-gradient(180deg, #0f172a 0%, #0d1526 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo area */}
      <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
          style={{ background: 'linear-gradient(135deg, #ea580c, #f97316)' }}
        >
          <Printer size={17} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-700 text-white leading-tight truncate tracking-tight" style={{ fontWeight: 700 }}>
            La Martina
          </p>
          <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>
            Fotocopiadora
          </p>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 py-4 px-3 flex flex-col gap-0.5">
        {MAIN_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'text-white'
                    : 'hover:text-white'
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? {
                      background: 'rgba(249,115,22,0.15)',
                      color: '#fb923c',
                      boxShadow: 'inset 2px 0 0 #f97316',
                    }
                  : { color: 'rgba(255,255,255,0.45)' }
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={17} style={isActive ? { color: '#fb923c' } : {}} />
                  {item.label}
                </>
              )}
            </NavLink>
          )
        })}

        {/* Admin section */}
        {isAdmin && ADMIN_ITEMS.length > 0 && (
          <>
            <div
              className="mx-3 my-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
            />
            <p
              className="px-3 pb-1 text-xs uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.25)', fontWeight: 600, letterSpacing: '0.1em' }}
            >
              Admin
            </p>
            {ADMIN_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive ? 'text-white' : 'hover:text-white'
                    }`
                  }
                  style={({ isActive }) =>
                    isActive
                      ? {
                          background: 'rgba(249,115,22,0.15)',
                          color: '#fb923c',
                          boxShadow: 'inset 2px 0 0 #f97316',
                        }
                      : { color: 'rgba(255,255,255,0.45)' }
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={17} style={isActive ? { color: '#fb923c' } : {}} />
                      {item.label}
                    </>
                  )}
                </NavLink>
              )
            })}
          </>
        )}
      </nav>

      {/* Footer */}
      <div
        className="px-5 py-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
      >
        <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 500 }}>
          v1.0.0 · ARS
        </p>
      </div>
    </aside>
  )
}
