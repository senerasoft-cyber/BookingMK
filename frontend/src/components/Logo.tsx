const SIZES = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
} as const

export function Logo({
  size = 'md',
  inverted = false,
  className = '',
}: {
  size?: keyof typeof SIZES
  inverted?: boolean
  className?: string
}) {
  return (
    <span
      className={`font-display ${SIZES[size]} font-semibold tracking-tight ${
        inverted ? 'text-white' : 'text-stone-900 dark:text-stone-50'
      } ${className}`}
    >
      buk<span className="text-amber-500">ano</span>
    </span>
  )
}
