export interface AccentPalette {
  canvas: string
  canvasFrom: string
  soft: string
  softText: string
  main: string
  mainHover: string
  mainText: string
  ring: string
}

export const ACCENTS: Record<string, AccentPalette> = {
  amber: {
    canvas: 'bg-amber-50 dark:bg-amber-950/30',
    canvasFrom: 'from-amber-50 dark:from-amber-950/30',
    soft: 'bg-amber-100 dark:bg-amber-900/40',
    softText: 'text-amber-700 dark:text-amber-300',
    main: 'bg-amber-500 dark:bg-amber-500',
    mainHover: 'hover:bg-amber-600 dark:hover:bg-amber-400',
    mainText: 'text-white',
    ring: 'ring-amber-300 dark:ring-amber-700',
  },
  rose: {
    canvas: 'bg-rose-50 dark:bg-rose-950/30',
    canvasFrom: 'from-rose-50 dark:from-rose-950/30',
    soft: 'bg-rose-100 dark:bg-rose-900/40',
    softText: 'text-rose-700 dark:text-rose-300',
    main: 'bg-rose-500 dark:bg-rose-500',
    mainHover: 'hover:bg-rose-600 dark:hover:bg-rose-400',
    mainText: 'text-white',
    ring: 'ring-rose-300 dark:ring-rose-700',
  },
  fuchsia: {
    canvas: 'bg-fuchsia-50 dark:bg-fuchsia-950/30',
    canvasFrom: 'from-fuchsia-50 dark:from-fuchsia-950/30',
    soft: 'bg-fuchsia-100 dark:bg-fuchsia-900/40',
    softText: 'text-fuchsia-700 dark:text-fuchsia-300',
    main: 'bg-fuchsia-500 dark:bg-fuchsia-500',
    mainHover: 'hover:bg-fuchsia-600 dark:hover:bg-fuchsia-400',
    mainText: 'text-white',
    ring: 'ring-fuchsia-300 dark:ring-fuchsia-700',
  },
  violet: {
    canvas: 'bg-violet-50 dark:bg-violet-950/30',
    canvasFrom: 'from-violet-50 dark:from-violet-950/30',
    soft: 'bg-violet-100 dark:bg-violet-900/40',
    softText: 'text-violet-700 dark:text-violet-300',
    main: 'bg-violet-500 dark:bg-violet-500',
    mainHover: 'hover:bg-violet-600 dark:hover:bg-violet-400',
    mainText: 'text-white',
    ring: 'ring-violet-300 dark:ring-violet-700',
  },
  teal: {
    canvas: 'bg-teal-50 dark:bg-teal-950/30',
    canvasFrom: 'from-teal-50 dark:from-teal-950/30',
    soft: 'bg-teal-100 dark:bg-teal-900/40',
    softText: 'text-teal-700 dark:text-teal-300',
    main: 'bg-teal-500 dark:bg-teal-500',
    mainHover: 'hover:bg-teal-600 dark:hover:bg-teal-400',
    mainText: 'text-white',
    ring: 'ring-teal-300 dark:ring-teal-700',
  },
  sky: {
    canvas: 'bg-sky-50 dark:bg-sky-950/30',
    canvasFrom: 'from-sky-50 dark:from-sky-950/30',
    soft: 'bg-sky-100 dark:bg-sky-900/40',
    softText: 'text-sky-700 dark:text-sky-300',
    main: 'bg-sky-500 dark:bg-sky-500',
    mainHover: 'hover:bg-sky-600 dark:hover:bg-sky-400',
    mainText: 'text-white',
    ring: 'ring-sky-300 dark:ring-sky-700',
  },
  emerald: {
    canvas: 'bg-emerald-50 dark:bg-emerald-950/30',
    canvasFrom: 'from-emerald-50 dark:from-emerald-950/30',
    soft: 'bg-emerald-100 dark:bg-emerald-900/40',
    softText: 'text-emerald-700 dark:text-emerald-300',
    main: 'bg-emerald-500 dark:bg-emerald-500',
    mainHover: 'hover:bg-emerald-600 dark:hover:bg-emerald-400',
    mainText: 'text-white',
    ring: 'ring-emerald-300 dark:ring-emerald-700',
  },
  orange: {
    canvas: 'bg-orange-50 dark:bg-orange-950/30',
    canvasFrom: 'from-orange-50 dark:from-orange-950/30',
    soft: 'bg-orange-100 dark:bg-orange-900/40',
    softText: 'text-orange-700 dark:text-orange-300',
    main: 'bg-orange-500 dark:bg-orange-500',
    mainHover: 'hover:bg-orange-600 dark:hover:bg-orange-400',
    mainText: 'text-white',
    ring: 'ring-orange-300 dark:ring-orange-700',
  },
  slate: {
    canvas: 'bg-slate-50 dark:bg-slate-900/40',
    canvasFrom: 'from-slate-50 dark:from-slate-900/40',
    soft: 'bg-slate-100 dark:bg-slate-800/60',
    softText: 'text-slate-700 dark:text-slate-300',
    main: 'bg-slate-700 dark:bg-slate-600',
    mainHover: 'hover:bg-slate-800 dark:hover:bg-slate-500',
    mainText: 'text-white',
    ring: 'ring-slate-300 dark:ring-slate-700',
  },
}

export const DEFAULT_ACCENT = 'slate'

export function getAccent(accentKey: string | null | undefined): AccentPalette {
  return ACCENTS[accentKey ?? DEFAULT_ACCENT] ?? ACCENTS[DEFAULT_ACCENT]
}

export const ACCENT_KEYS = Object.keys(ACCENTS)
