const PALETTE = [
  { bg: 'bg-sky-100 dark:bg-sky-950/30', text: 'text-sky-700 dark:text-sky-400', dot: 'bg-sky-500' },
  { bg: 'bg-rose-100 dark:bg-rose-950/30', text: 'text-rose-700 dark:text-rose-400', dot: 'bg-rose-500' },
  { bg: 'bg-amber-100 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  { bg: 'bg-violet-100 dark:bg-violet-950/30', text: 'text-violet-700 dark:text-violet-400', dot: 'bg-violet-500' },
  { bg: 'bg-emerald-100 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  { bg: 'bg-orange-100 dark:bg-orange-950/30', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
  { bg: 'bg-teal-100 dark:bg-teal-950/30', text: 'text-teal-700 dark:text-teal-400', dot: 'bg-teal-500' },
  { bg: 'bg-fuchsia-100 dark:bg-fuchsia-950/30', text: 'text-fuchsia-700 dark:text-fuchsia-400', dot: 'bg-fuchsia-500' },
]

/** Deterministic by staff id, so the same staff member always gets the same
 * color across the agenda regardless of sort order or filtering. */
export function getStaffColor(staffId: number | null | undefined) {
  if (staffId == null) return PALETTE[0]
  return PALETTE[staffId % PALETTE.length]
}
