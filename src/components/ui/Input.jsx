import React from 'react'

export default function Input({
  label,
  error,
  className = '',
  prefix,
  suffix,
  ...props
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-gray-500 text-sm select-none pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          className={`w-full rounded-xl border border-gray-200 bg-white py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:bg-gray-50 disabled:text-gray-500 ${prefix ? 'pl-8' : 'pl-3'} ${suffix ? 'pr-8' : 'pr-3'} ${error ? 'border-danger-400 focus:border-danger-500 focus:ring-danger-500/20' : ''} ${className}`}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 text-gray-500 text-sm select-none pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-danger-600">{error}</p>}
    </div>
  )
}
