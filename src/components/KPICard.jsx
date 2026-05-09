import React from 'react'
import { formatAmount } from '../utils/currency'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { usePrivacy } from '../context/PrivacyContext'

const VARIANTS = {
  ingreso: {
    bg: '#ffffff',
    border: '#d1fae5',
    accent: '#16a34a',
    iconBg: 'rgba(22,163,74,0.10)',
    iconColor: '#16a34a',
    amountColor: '#15803d',
    stripe: '#22c55e',
    label: '#6b7280',
  },
  egreso: {
    bg: '#ffffff',
    border: '#fee2e2',
    accent: '#dc2626',
    iconBg: 'rgba(220,38,38,0.10)',
    iconColor: '#dc2626',
    amountColor: '#b91c1c',
    stripe: '#ef4444',
    label: '#6b7280',
  },
  resultado_pos: {
    bg: '#ffffff',
    border: '#d1fae5',
    accent: '#16a34a',
    iconBg: 'rgba(22,163,74,0.10)',
    iconColor: '#16a34a',
    amountColor: '#15803d',
    stripe: '#22c55e',
    label: '#6b7280',
  },
  resultado_neg: {
    bg: '#ffffff',
    border: '#fee2e2',
    accent: '#dc2626',
    iconBg: 'rgba(220,38,38,0.10)',
    iconColor: '#dc2626',
    amountColor: '#b91c1c',
    stripe: '#ef4444',
    label: '#6b7280',
  },
  resultado_zero: {
    bg: '#ffffff',
    border: '#e5e7eb',
    accent: '#6b7280',
    iconBg: 'rgba(107,114,128,0.10)',
    iconColor: '#6b7280',
    amountColor: '#374151',
    stripe: '#9ca3af',
    label: '#6b7280',
  },
  neutral: {
    bg: '#ffffff',
    border: '#e5e7eb',
    accent: '#6b7280',
    iconBg: 'rgba(107,114,128,0.08)',
    iconColor: '#6b7280',
    amountColor: '#111827',
    stripe: '#d1d5db',
    label: '#6b7280',
  },
  primary: {
    bg: '#0f172a',
    border: '#1e293b',
    accent: '#f97316',
    iconBg: 'rgba(249,115,22,0.15)',
    iconColor: '#fb923c',
    amountColor: '#ffffff',
    stripe: '#f97316',
    label: 'rgba(255,255,255,0.55)',
  },
}

export default function KPICard({ label, amount, variant = 'neutral', icon: Icon, subtitle }) {
  const { hideNumbers } = usePrivacy()
  const isPositive = amount > 0
  const isNegative = amount < 0

  let key = variant
  if (variant === 'resultado') {
    key = isNegative ? 'resultado_neg' : isPositive ? 'resultado_pos' : 'resultado_zero'
  }

  const v = VARIANTS[key] || VARIANTS.neutral

  const autoIcon =
    variant === 'resultado'
      ? isNegative
        ? TrendingDown
        : isPositive
        ? TrendingUp
        : Minus
      : variant === 'egreso'
      ? TrendingDown
      : TrendingUp

  const DisplayIcon = Icon || autoIcon

  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: v.bg,
        border: `1px solid ${v.border}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}
    >
      {/* Top accent stripe */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
        style={{ background: v.stripe }}
      />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className="text-xs font-semibold uppercase tracking-wider truncate"
            style={{ color: v.label, letterSpacing: '0.06em' }}
          >
            {label}
          </p>
          <p
            className="text-2xl font-bold mt-1.5 tabular-nums leading-none"
            style={{ color: v.amountColor }}
          >
            {formatAmount(amount, hideNumbers)}
          </p>
          {subtitle && (
            <p className="text-xs mt-1" style={{ color: v.label }}>
              {subtitle}
            </p>
          )}
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: v.iconBg }}
        >
          <DisplayIcon size={19} style={{ color: v.iconColor }} />
        </div>
      </div>
    </div>
  )
}
