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
  const [gastosFijos, setGastosFijos] = useState([])
  const [gastosMes, setGastosMes] = useState([])
  const [pagosCuenta, setPagosCuenta] = useState([])
  const [pedidoActivos, setPedidoActivos] = useState([])
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
  const refreshGastosFijos = useCallback(async () => {
    try { setGastosFijos(await db.gastosFijos.getAll()) } catch { setGastosFijos([]) }
  }, [])
  const refreshGastosMes = useCallback(async () => {
    try { setGastosMes(await db.gastosMes.getAll()) } catch { setGastosMes([]) }
  }, [])
  const refreshPagosCuenta = useCallback(async () => {
    try { setPagosCuenta(await db.pagosCuenta.getAll()) } catch { setPagosCuenta([]) }
  }, [])
  const refreshPedidos = useCallback(async () => {
    try { setPedidoActivos(await db.pedidos.getActivos()) } catch { setPedidoActivos([]) }
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
          refreshGastosFijos(),
          refreshGastosMes(),
          refreshPagosCuenta(),
          refreshPedidos(),
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gastos_fijos' }, refreshGastosFijos)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gastos_mes' }, refreshGastosMes)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pagos_cuenta' }, refreshPagosCuenta)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedido_items' }, refreshPedidos)
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

  // --- Gastos Fijos ---
  const createGastoFijo = useCallback(async (data) => { const item = await db.gastosFijos.create(data); await refreshGastosFijos(); return item }, [refreshGastosFijos])
  const updateGastoFijo = useCallback(async (id, data) => { await db.gastosFijos.update(id, data); await refreshGastosFijos() }, [refreshGastosFijos])
  const deleteGastoFijo = useCallback(async (id) => { await db.gastosFijos.delete(id); await refreshGastosFijos() }, [refreshGastosFijos])

  // --- Gastos Mes ---
  const createGastoMes = useCallback(async (data) => { const item = await db.gastosMes.create(data); await refreshGastosMes(); return item }, [refreshGastosMes])
  const updateGastoMes = useCallback(async (id, data) => { await db.gastosMes.update(id, data); await refreshGastosMes() }, [refreshGastosMes])
  const deleteGastoMes = useCallback(async (id) => { await db.gastosMes.delete(id); await refreshGastosMes() }, [refreshGastosMes])
  const seedGastosMes = useCallback(async (mes, gastosFijosActuales, userId) => {
    const items = await db.gastosMes.seedMonth(mes, gastosFijosActuales, userId)
    await refreshGastosMes()
    return items
  }, [refreshGastosMes])

  // --- Pagos Cuenta ---
  const createPagoCuenta = useCallback(async (data) => { const item = await db.pagosCuenta.create(data); await refreshPagosCuenta(); return item }, [refreshPagosCuenta])
  const deletePagoCuenta = useCallback(async (id) => { await db.pagosCuenta.delete(id); await refreshPagosCuenta() }, [refreshPagosCuenta])

  // --- Pedidos ---
  const addToPedido = useCallback(async (productoId) => {
    await db.pedidos.add(productoId)
    await refreshPedidos()
  }, [refreshPedidos])

  const removeFromPedido = useCallback(async (id) => {
    await db.pedidos.remove(id)
    await refreshPedidos()
  }, [refreshPedidos])

  const cerrarPedido = useCallback(async (ids) => {
    await db.pedidos.cerrarPedido(ids)
    await refreshPedidos()
  }, [refreshPedidos])

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
      gastosFijos, gastosMes, pagosCuenta,
      createGastoFijo, updateGastoFijo, deleteGastoFijo,
      createGastoMes, updateGastoMes, deleteGastoMes, seedGastosMes,
      createPagoCuenta, deletePagoCuenta,
      pedidoActivos,
      addToPedido, removeFromPedido, cerrarPedido,
      refreshMovements, refreshCategories, refreshUsers, refreshInstituciones, refreshFiados, refreshCierres,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  return useContext(DataContext)
}
