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
      <div className="mt-4 flex flex-col gap-3">
        {services.map((service) => (
          <button
            key={service.id}
            type="button"
            onClick={() => onSelect(service)}
            className="group flex items-center gap-4 rounded-2xl bg-stone-50 p-4 text-left transition-all hover:bg-stone-100 hover:shadow-md dark:bg-stone-800/60 dark:hover:bg-stone-800"
          >
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accent.soft} ${accent.softText}`}
            >
              <Sparkles size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-stone-900 dark:text-stone-50">{service.name}</p>
              <p className="mt-0.5 flex items-center gap-1 text-sm text-stone-500 dark:text-stone-400">
                <Clock size={13} />
                {service.duration_minutes} {t('public.service.minutes')}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-bold ${accent.soft} ${accent.softText}`}
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
