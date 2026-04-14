import { formatDateTime } from './dateUtils'

const METHOD_LABELS = {
  Cash: 'Efectivo',
  QRTransfer: 'QR/Transferencia',
  Card: 'Tarjeta',
}

export function exportMovementsToCSV(movements, categories, users) {
  const headers = [
    'Fecha y Hora',
    'Tipo',
    'Categoría',
    'Método de Pago',
    'Monto (ARS)',
    'Nota',
    'Usuario',
  ]

  const rows = movements.map((m) => {
    const cat = categories.find((c) => c.id === m.categoryId)
    const user = users.find((u) => u.id === m.createdBy)
    return [
      formatDateTime(m.createdAt),
      m.type,
      cat?.name || '',
      METHOD_LABELS[m.paymentMethod] || m.paymentMethod,
      m.amount.toFixed(2),
      m.note || '',
      user?.name || '',
    ]
  })

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `movimientos_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
