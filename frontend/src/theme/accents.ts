export interface AccentPalette {
  canvas: string
  soft: string
  softText: string
  main: string
  mainHover: string
  mainText: string
}

export const ACCENTS: Record<string, AccentPalette> = {
  amber: {
    canvas: 'bg-amber-50',
    soft: 'bg-amber-100',
    softText: 'text-amber-700',
    main: 'bg-amber-500',
    mainHover: 'hover:bg-amber-600',
    mainText: 'text-white',
  },
  rose: {
    canvas: 'bg-rose-50',
    soft: 'bg-rose-100',
    softText: 'text-rose-700',
    main: 'bg-rose-500',
    mainHover: 'hover:bg-rose-600',
    mainText: 'text-white',
  },
  fuchsia: {
    canvas: 'bg-fuchsia-50',
    soft: 'bg-fuchsia-100',
    softText: 'text-fuchsia-700',
    main: 'bg-fuchsia-500',
    mainHover: 'hover:bg-fuchsia-600',
    mainText: 'text-white',
  },
  violet: {
    canvas: 'bg-violet-50',
    soft: 'bg-violet-100',
    softText: 'text-violet-700',
    main: 'bg-violet-500',
    mainHover: 'hover:bg-violet-600',
    mainText: 'text-white',
  },
  teal: {
    canvas: 'bg-teal-50',
    soft: 'bg-teal-100',
    softText: 'text-teal-700',
    main: 'bg-teal-500',
    mainHover: 'hover:bg-teal-600',
    mainText: 'text-white',
  },
  sky: {
    canvas: 'bg-sky-50',
    soft: 'bg-sky-100',
    softText: 'text-sky-700',
    main: 'bg-sky-500',
    mainHover: 'hover:bg-sky-600',
    mainText: 'text-white',
  },
  emerald: {
    canvas: 'bg-emerald-50',
    soft: 'bg-emerald-100',
    softText: 'text-emerald-700',
    main: 'bg-emerald-500',
    mainHover: 'hover:bg-emerald-600',
    mainText: 'text-white',
  },
  orange: {
    canvas: 'bg-orange-50',
    soft: 'bg-orange-100',
    softText: 'text-orange-700',
    main: 'bg-orange-500',
    mainHover: 'hover:bg-orange-600',
    mainText: 'text-white',
  },
  slate: {
    canvas: 'bg-slate-50',
    soft: 'bg-slate-100',
    softText: 'text-slate-700',
    main: 'bg-slate-700',
    mainHover: 'hover:bg-slate-800',
    mainText: 'text-white',
  },
}

export const DEFAULT_ACCENT = 'slate'

export function getAccent(accentKey: string | null | undefined): AccentPalette {
  return ACCENTS[accentKey ?? DEFAULT_ACCENT] ?? ACCENTS[DEFAULT_ACCENT]
}

export const ACCENT_KEYS = Object.keys(ACCENTS)
