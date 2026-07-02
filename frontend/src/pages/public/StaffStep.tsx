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
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{t('public.staff.subtitle')}</p>
      <div className="mt-4 flex flex-col gap-3">
        {staff.map((member) => (
          <button
            key={member.id}
            type="button"
            onClick={() => onSelect(member)}
            className="group flex items-center gap-4 rounded-2xl bg-stone-50 p-4 text-left transition-all hover:bg-stone-100 hover:shadow-md dark:bg-stone-800/60 dark:hover:bg-stone-800"
          >
            {member.photo_url ? (
              <img
                src={member.photo_url}
                alt={member.name}
                className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-stone-200 dark:ring-stone-700"
              />
            ) : (
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-display text-base font-semibold ring-2 ring-stone-200 dark:ring-stone-700 ${accent.soft} ${accent.softText}`}
              >
                {initials(member.name)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-stone-900 dark:text-stone-50">{member.name}</p>
              {member.bio && (
                <p className="mt-0.5 line-clamp-1 text-sm text-stone-500 dark:text-stone-400">{member.bio}</p>
              )}
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-transform group-hover:translate-x-0.5 ${accent.soft} ${accent.softText}`}
            >
              {t('public.staff.select')} →
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
