import { useTranslation } from 'react-i18next'

import { getAccent } from '../../theme/accents'
import type { PublicStaff } from '../../types'

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
      <h2 className="font-display text-xl font-semibold text-stone-900">
        {t('public.staff.title')}
      </h2>
      <div className="mt-4 flex flex-col gap-2">
        {staff.map((member) => (
          <button
            key={member.id}
            type="button"
            onClick={() => onSelect(member)}
            className="flex items-center justify-between rounded-xl border border-stone-200 p-4 text-left transition hover:border-stone-300"
          >
            <span className="flex items-center gap-3">
              {member.photo_url && (
                <img
                  src={member.photo_url}
                  alt={member.name}
                  className="h-9 w-9 rounded-full object-cover"
                />
              )}
              <span className="font-medium text-stone-900">{member.name}</span>
            </span>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${accent.soft} ${accent.softText}`}
            >
              {t('public.staff.select')}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
