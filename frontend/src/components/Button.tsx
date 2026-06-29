import type { ButtonHTMLAttributes } from 'react'

import { getAccent } from '../theme/accents'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  accentKey?: string
}

export function Button({ variant = 'primary', accentKey, className = '', ...props }: ButtonProps) {
  if (variant === 'secondary') {
    return (
      <button
        className={`rounded-xl px-5 py-2.5 font-medium text-stone-600 transition hover:bg-stone-100 disabled:opacity-50 ${className}`}
        {...props}
      />
    )
  }

  const accent = getAccent(accentKey)
  return (
    <button
      className={`rounded-xl px-5 py-2.5 font-medium shadow-sm transition disabled:opacity-50 ${accent.main} ${accent.mainHover} ${accent.mainText} ${className}`}
      {...props}
    />
  )
}
