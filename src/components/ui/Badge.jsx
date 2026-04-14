import React from 'react'

const VARIANTS = {
  ingreso: 'bg-success-100 text-success-700 ring-1 ring-success-200',
  egreso: 'bg-danger-100 text-danger-700 ring-1 ring-danger-200',
  admin: 'bg-primary-100 text-primary-700 ring-1 ring-primary-200',
  empleado: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
  cash: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
  qr: 'bg-violet-100 text-violet-700 ring-1 ring-violet-200',
  card: 'bg-sky-100 text-sky-700 ring-1 ring-sky-200',
  active: 'bg-success-100 text-success-700 ring-1 ring-success-200',
  inactive: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
}

export default function Badge({ variant = 'ingreso', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${VARIANTS[variant] || VARIANTS.empleado} ${className}`}
    >
      {children}
    </span>
  )
}

export const PAYMENT_BADGE = {
  Cash: { variant: 'cash', label: 'Efectivo' },
  QRTransfer: { variant: 'qr', label: 'QR/Transferencia' },
  Card: { variant: 'card', label: 'Tarjeta' },
}
