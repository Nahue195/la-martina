import React from 'react'
import { Loader2, WifiOff } from 'lucide-react'
import Header from './Header'
import Sidebar from './Sidebar'
import { useData } from '../../context/DataContext'

function LoadingScreen() {
  return (
    <div className="flex-1 flex items-center justify-center" style={{ background: '#f7f6f3' }}>
      <div className="text-center">
        <Loader2 size={32} className="mx-auto text-primary-500 animate-spin" />
        <p className="text-sm text-gray-400 mt-3 font-medium">Cargando datos...</p>
      </div>
    </div>
  )
}

function ErrorScreen({ message }) {
  return (
    <div className="flex-1 flex items-center justify-center" style={{ background: '#f7f6f3' }}>
      <div className="text-center max-w-sm px-4">
        <WifiOff size={32} className="mx-auto text-danger-400 mb-3" />
        <p className="font-semibold text-gray-800">Sin conexión</p>
        <p className="text-sm text-gray-400 mt-1">{message}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 text-sm text-primary-500 hover:underline font-medium"
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}

export default function Layout({ children }) {
  const { loading, loadError } = useData()

  return (
    <div className="flex h-screen min-w-[1200px]" style={{ background: '#f7f6f3' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        {loading ? (
          <LoadingScreen />
        ) : loadError ? (
          <ErrorScreen message={loadError} />
        ) : (
          <main className="flex-1 overflow-auto">{children}</main>
        )}
      </div>
    </div>
  )
}
