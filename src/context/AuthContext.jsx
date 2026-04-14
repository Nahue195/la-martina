import React, { createContext, useContext, useState } from 'react'
import { db } from '../utils/db'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('cg_auth')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  async function login(email, password) {
    try {
      const found = await db.users.findByEmail(email)
      if (found && found.password === password) {
        const { password: _pw, ...safeUser } = found
        sessionStorage.setItem('cg_auth', JSON.stringify(safeUser))
        setUser(safeUser)
        return { success: true }
      }
      return { success: false, error: 'Usuario o contraseña incorrectos' }
    } catch {
      return { success: false, error: 'Error de conexión. Revisá internet.' }
    }
  }

  function logout() {
    sessionStorage.removeItem('cg_auth')
    setUser(null)
  }

  async function refreshUser() {
    if (!user) return
    const fresh = await db.users.getById(user.id)
    if (fresh) {
      const { password: _pw, ...safeUser } = fresh
      sessionStorage.setItem('cg_auth', JSON.stringify(safeUser))
      setUser(safeUser)
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, isAdmin: user?.role === 'Admin' }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
