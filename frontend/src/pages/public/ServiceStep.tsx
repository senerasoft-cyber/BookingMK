import { Clock, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { getAccent } from '../../theme/accents'
import type { PublicService } from '../../types'

export default function ServiceStep({
  services,
  accentKey,
  currency,
  onSelect,
}: {
  services: PublicService[]
  accentKey: string
  currency: string
  onSelect: (service: PublicService) => void
}) {
  const { t } = useTranslation()
  const accent = getAccent(accentKey)

  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-stone-900 dark:text-stone-50">
        {t('public.service.title')}
      </h2>
      <div className="mt-4 flex flex-col gap-2.5">
        {services.map((service) => (
          <button
            key={service.id}
            type="button"
            onClick={() => onSelect(service)}
            className="flex items-center gap-4 rounded-2xl border border-stone-200 p-4 text-left transition hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md dark:border-stone-700 dark:hover:border-stone-600"
          >
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accent.soft} ${accent.softText}`}
            >
              <Sparkles size={20} />
            </div>
            <div className="flex-1">
              <p className="font-medium text-stone-900 dark:text-stone-100">{service.name}</p>
              <p className="mt-0.5 flex items-center gap-1 text-sm text-stone-500 dark:text-stone-400">
                <Clock size={13} />
                {service.duration_minutes} {t('public.service.minutes')}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${accent.soft} ${accent.softText}`}
            >
              {service.price} {currency}
            </span>
          </button>
        ))}
      </div>
      {services.length === 0 && (
        <p className="mt-4 text-stone-400 dark:text-stone-500">{t('public.service.empty')}</p>
      )}
    </div>
  )
}
