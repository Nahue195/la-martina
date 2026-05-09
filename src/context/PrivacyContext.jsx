import React, { createContext, useContext, useState, useCallback } from 'react'

const PrivacyContext = createContext(null)

export function PrivacyProvider({ children }) {
  const [hideNumbers, setHideNumbers] = useState(() => {
    try { return localStorage.getItem('cg_hide_numbers') === 'true' } catch { return false }
  })

  const toggleHideNumbers = useCallback(() => {
    setHideNumbers(prev => {
      const next = !prev
      try { localStorage.setItem('cg_hide_numbers', String(next)) } catch {}
      return next
    })
  }, [])

  return (
    <PrivacyContext.Provider value={{ hideNumbers, toggleHideNumbers }}>
      {children}
    </PrivacyContext.Provider>
  )
}

export function usePrivacy() {
  const ctx = useContext(PrivacyContext)
  if (!ctx) throw new Error('usePrivacy must be used within PrivacyProvider')
  return ctx
}
