export function formatARS(amount) {
  if (amount === null || amount === undefined) return '$ 0,00'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function parseAmount(str) {
  const cleaned = String(str).replace(/[^0-9,.-]/g, '').replace(',', '.')
  const val = parseFloat(cleaned)
  return isNaN(val) ? 0 : val
}
