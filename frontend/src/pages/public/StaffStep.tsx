import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { getAccent } from '../../theme/accents'
import type { PublicStaff } from '../../types'

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export default function StaffStep({
  staff,
  accentKey,
  onSelect,
}: {
  staff: PublicStaff[]
  accentKey: string
  onSelect: (staff: PublicStaff) => void
}) {
  const { t } = useTranslation()
  const accent = getAccent(accentKey)

  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-stone-900 dark:text-stone-50">
        {t('public.staff.title')}
      </h2>
      <div className="mt-4 flex flex-col gap-2.5">
        {staff.map((member) => (
          <button
            key={member.id}
            type="button"
            onClick={() => onSelect(member)}
            className="flex items-center gap-4 rounded-2xl border border-stone-200 p-4 text-left transition hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md dark:border-stone-700 dark:hover:border-stone-600"
          >
            {member.photo_url ? (
              <img
                src={member.photo_url}
                alt={member.name}
                className="h-12 w-12 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold ${accent.soft} ${accent.softText}`}
              >
                {initials(member.name)}
              </div>
            )}
            <div className="flex-1">
              <p className="font-medium text-stone-900 dark:text-stone-100">{member.name}</p>
              {member.bio && (
                <p className="mt-0.5 line-clamp-1 text-sm text-stone-500 dark:text-stone-400">{member.bio}</p>
              )}
            </div>
            <span className={`flex shrink-0 items-center gap-1 text-sm font-medium ${accent.softText}`}>
              {t('public.staff.select')}
              <ArrowRight size={15} />
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
