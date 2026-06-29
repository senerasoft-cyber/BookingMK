const PALETTE = [
  { bg: 'bg-sky-100', text: 'text-sky-700', dot: 'bg-sky-500' },
  { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },
  { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  { bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500' },
  { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', dot: 'bg-fuchsia-500' },
]

/** Deterministic by staff id, so the same staff member always gets the same
 * color across the agenda regardless of sort order or filtering. */
export function getStaffColor(staffId: number | null | undefined) {
  if (staffId == null) return PALETTE[0]
  return PALETTE[staffId % PALETTE.length]
}
