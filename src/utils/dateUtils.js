export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function toInputDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toISOString().slice(0, 10)
}

export function getDateRange(filter, customStart, customEnd) {
  const now = new Date()

  switch (filter) {
    case 'hoy': {
      const start = new Date(now)
      start.setHours(0, 0, 0, 0)
      const end = new Date(now)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    }
    case 'semana': {
      const day = now.getDay()
      const diffToMonday = day === 0 ? -6 : 1 - day
      const start = new Date(now)
      start.setDate(now.getDate() + diffToMonday)
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    }
    case 'mes': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      return { start, end }
    }
    case 'personalizado': {
      const start = customStart
        ? new Date(customStart + 'T00:00:00')
        : new Date(now.getFullYear(), now.getMonth(), 1)
      const end = customEnd ? new Date(customEnd + 'T23:59:59') : new Date()
      return { start, end }
    }
    default:
      return { start: new Date(0), end: new Date() }
  }
}

export function isInDateRange(dateStr, start, end) {
  const d = new Date(dateStr)
  return d >= start && d <= end
}

export function minutesAgo(dateStr) {
  return (Date.now() - new Date(dateStr).getTime()) / 60000
}
