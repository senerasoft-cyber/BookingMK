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
      <h2 className="font-display text-xl font-semibold text-stone-900">
        {t('public.service.title')}
      </h2>
      <div className="mt-4 flex flex-col gap-2">
        {services.map((service) => (
          <button
            key={service.id}
            type="button"
            onClick={() => onSelect(service)}
            className="flex items-center justify-between rounded-xl border border-stone-200 p-4 text-left transition hover:border-stone-300"
          >
            <div>
              <p className="font-medium text-stone-900">{service.name}</p>
              <p className="text-sm text-stone-500">
                {service.duration_minutes} {t('public.service.minutes')}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${accent.soft} ${accent.softText}`}
            >
              {service.price} {currency}
            </span>
          </button>
        ))}
      </div>
      {services.length === 0 && <p className="mt-4 text-stone-400">{t('public.service.empty')}</p>}
    </div>
  )
}
