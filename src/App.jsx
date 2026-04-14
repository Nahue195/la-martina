import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { ToastProvider } from './context/ToastContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Movimientos from './pages/Movimientos'
import Fiados from './pages/Fiados'
import Analytics from './pages/Analytics'
import Categorias from './pages/Categorias'
import Usuarios from './pages/Usuarios'
import Productos from './pages/Productos'
import TrabajosColegio from './pages/TrabajosColegio'
import TrabajosAnillado from './pages/TrabajosAnillado'

function PrivateRoute({ children, adminOnly = false }) {
  const { user, isAdmin } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />
  return <Layout>{children}</Layout>
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/movimientos" element={<PrivateRoute><Movimientos /></PrivateRoute>} />
      <Route path="/fiados" element={<PrivateRoute><Fiados /></PrivateRoute>} />
      <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
      <Route path="/productos" element={<PrivateRoute><Productos /></PrivateRoute>} />
      <Route path="/trabajos-colegio" element={<PrivateRoute><TrabajosColegio /></PrivateRoute>} />
      <Route path="/anillado" element={<PrivateRoute><TrabajosAnillado /></PrivateRoute>} />
      <Route path="/categorias" element={<PrivateRoute adminOnly><Categorias /></PrivateRoute>} />
      <Route path="/usuarios" element={<PrivateRoute adminOnly><Usuarios /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
