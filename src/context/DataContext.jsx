import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import { db } from '../utils/db'
import { supabase } from '../lib/supabase'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [movements, setMovements] = useState([])
  const [categories, setCategories] = useState([])
  const [users, setUsers] = useState([])
  const [instituciones, setInstituciones] = useState([])
  const [fiados, setFiados] = useState([])
  const [cierres, setCierres] = useState([])
  const [config, setConfig] = useState({ cycleStart: null })
  const [trabajosColegio, setTrabajosColegio] = useState([])
  const [trabajosAnillado, setTrabajosAnillado] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const refreshConfig = useCallback(async () => {
    try { setConfig(await db.config.get()) } catch { setConfig({ cycleStart: null }) }
  }, [])

  const setCycleStart = useCallback(async (date) => {
    await db.config.update({ cycleStart: date || null })
    await refreshConfig()
  }, [refreshConfig])

  const visibleMovements = useMemo(() => {
    if (!config.cycleStart) return movements
    return movements.filter((m) => m.createdAt >= config.cycleStart + 'T00:00:00')
  }, [movements, config.cycleStart])

  const refreshMovements = useCallback(async () => { setMovements(await db.movements.getAll()) }, [])
  const refreshCategories = useCallback(async () => { setCategories(await db.categories.getAll()) }, [])
  const refreshUsers = useCallback(async () => { setUsers(await db.users.getAll()) }, [])
  const refreshInstituciones = useCallback(async () => { setInstituciones(await db.instituciones.getAll()) }, [])
  const refreshFiados = useCallback(async () => { setFiados(await db.fiados.getAll()) }, [])
  const refreshCierres = useCallback(async () => {
    try { setCierres(await db.cierres.getAll()) } catch { setCierres([]) }
  }, [])
  const refreshTrabajosColegio = useCallback(async () => {
    try { setTrabajosColegio(await db.trabajosColegio.getAll()) } catch { setTrabajosColegio([]) }
  }, [])
  const refreshTrabajosAnillado = useCallback(async () => {
    try { setTrabajosAnillado(await db.trabajosAnillado.getAll()) } catch { setTrabajosAnillado([]) }
  }, [])

  // Initial load
  useEffect(() => {
    async function loadAll() {
      try {
        await Promise.all([
          refreshMovements(),
          refreshCategories(),
          refreshUsers(),
          refreshInstituciones(),
          refreshFiados(),
          refreshCierres(),
          refreshConfig(),
          refreshTrabajosColegio(),
          refreshTrabajosAnillado(),
        ])
      } catch (err) {
        setLoadError('No se pudo conectar a la base de datos. Verificá la conexión.')
        console.error('DataContext load error:', err)
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movimientos' }, refreshMovements)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categorias' }, refreshCategories)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, refreshUsers)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'instituciones' }, refreshInstituciones)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fiados' }, refreshFiados)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cierres_caja' }, refreshCierres)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracion' }, refreshConfig)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trabajos_colegio' }, refreshTrabajosColegio)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trabajos_anillado' }, refreshTrabajosAnillado)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [refreshMovements, refreshCategories, refreshUsers, refreshInstituciones, refreshFiados])

  // --- Movements ---
  const createMovement = useCallback(async (data) => { const item = await db.movements.create(data); await refreshMovements(); return item }, [refreshMovements])
  const updateMovement = useCallback(async (id, data) => { await db.movements.update(id, data); await refreshMovements() }, [refreshMovements])
  const deleteMovement = useCallback(async (id) => { await db.movements.delete(id); await refreshMovements() }, [refreshMovements])

  // --- Categories ---
  const createCategory = useCallback(async (data) => { const item = await db.categories.create(data); await refreshCategories(); return item }, [refreshCategories])
  const updateCategory = useCallback(async (id, data) => { await db.categories.update(id, data); await refreshCategories() }, [refreshCategories])
  const deleteCategory = useCallback(async (id) => { await db.categories.delete(id); await refreshCategories() }, [refreshCategories])

  // --- Users ---
  const createUser = useCallback(async (data) => { const item = await db.users.create(data); await refreshUsers(); return item }, [refreshUsers])
  const updateUser = useCallback(async (id, data) => { await db.users.update(id, data); await refreshUsers() }, [refreshUsers])
  const deleteUser = useCallback(async (id) => { await db.users.delete(id); await refreshUsers() }, [refreshUsers])

  // --- Instituciones ---
  const createInstitucion = useCallback(async (data) => { const item = await db.instituciones.create(data); await refreshInstituciones(); return item }, [refreshInstituciones])
  const updateInstitucion = useCallback(async (id, data) => { await db.instituciones.update(id, data); await refreshInstituciones() }, [refreshInstituciones])
  const deleteInstitucion = useCallback(async (id) => { await db.instituciones.delete(id); await refreshInstituciones(); await refreshFiados() }, [refreshInstituciones, refreshFiados])

  // --- Fiados ---
  const createFiado = useCallback(async (data) => { const item = await db.fiados.create(data); await refreshFiados(); return item }, [refreshFiados])
  const updateFiado = useCallback(async (id, data) => { await db.fiados.update(id, data); await refreshFiados() }, [refreshFiados])
  const deleteFiado = useCallback(async (id) => { await db.fiados.delete(id); await refreshFiados() }, [refreshFiados])
  const markAllFiadosPaid = useCallback(async (institucionId) => { await db.fiados.markAllPaid(institucionId); await refreshFiados() }, [refreshFiados])

  // --- Productos ---
  const createProducto = useCallback(async (data) => { const item = await db.productos.create(data); return item }, [])
  const updateProducto = useCallback(async (id, data) => { await db.productos.update(id, data) }, [])
  const deleteProducto = useCallback(async (id) => { await db.productos.delete(id) }, [])

  // --- Cierres ---
  const createCierre = useCallback(async (data) => { const item = await db.cierres.create(data); await refreshCierres(); return item }, [refreshCierres])
  const deleteCierre = useCallback(async (id) => { await db.cierres.delete(id); await refreshCierres() }, [refreshCierres])

  // --- Trabajos Colegio ---
  const createTrabajoColegio = useCallback(async (data) => { const item = await db.trabajosColegio.create(data); await refreshTrabajosColegio(); return item }, [refreshTrabajosColegio])
  const updateTrabajoColegio = useCallback(async (id, data) => { await db.trabajosColegio.update(id, data); await refreshTrabajosColegio() }, [refreshTrabajosColegio])
  const deleteTrabajoColegio = useCallback(async (id) => { await db.trabajosColegio.delete(id); await refreshTrabajosColegio() }, [refreshTrabajosColegio])

  // --- Trabajos Anillado ---
  const createTrabajoAnillado = useCallback(async (data) => { const item = await db.trabajosAnillado.create(data); await refreshTrabajosAnillado(); return item }, [refreshTrabajosAnillado])
  const updateTrabajoAnillado = useCallback(async (id, data) => { await db.trabajosAnillado.update(id, data); await refreshTrabajosAnillado() }, [refreshTrabajosAnillado])
  const deleteTrabajoAnillado = useCallback(async (id) => { await db.trabajosAnillado.delete(id); await refreshTrabajosAnillado() }, [refreshTrabajosAnillado])

  return (
    <DataContext.Provider value={{
      movements: visibleMovements, allMovements: movements,
      categories, users, instituciones, fiados, cierres,
      trabajosColegio, trabajosAnillado,
      cycleStart: config.cycleStart, setCycleStart,
      loading, loadError,
      createMovement, updateMovement, deleteMovement,
      createCategory, updateCategory, deleteCategory,
      createUser, updateUser, deleteUser,
      createInstitucion, updateInstitucion, deleteInstitucion,
      createFiado, updateFiado, deleteFiado, markAllFiadosPaid,
      createProducto, updateProducto, deleteProducto,
      createCierre, deleteCierre,
      createTrabajoColegio, updateTrabajoColegio, deleteTrabajoColegio,
      createTrabajoAnillado, updateTrabajoAnillado, deleteTrabajoAnillado,
      refreshMovements, refreshCategories, refreshUsers, refreshInstituciones, refreshFiados, refreshCierres,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  return useContext(DataContext)
}
