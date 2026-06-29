import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../components/Button'
import { apiGet } from '../../lib/api'
import { formatDateKey, formatTimeFromIso, nextNDays } from '../../lib/dates'
import { getAccent } from '../../theme/accents'
import type { PublicService } from '../../types'

export default function DateTimeStep({
  slug,
  service,
  accentKey,
  onBack,
  onSelectSlot,
}: {
  slug: string
  service: PublicService
  accentKey: string
  onBack: () => void
  onSelectSlot: (iso: string) => void
}) {
  const { t, i18n } = useTranslation()
  const accent = getAccent(accentKey)
  const days = nextNDays(14)
  const [selectedDate, setSelectedDate] = useState(formatDateKey(days[0]))

  const { data } = useQuery({
    queryKey: ['availability', slug, service.id, selectedDate],
    queryFn: () =>
      apiGet<{ date: string; slots: string[] }>(
        `/b/${slug}/availability?service_id=${service.id}&date=${selectedDate}`,
      ),
  })

  const dayFormatter = new Intl.DateTimeFormat(i18n.language.startsWith('en') ? 'en-US' : 'mk-MK', {
    weekday: 'short',
    day: 'numeric',
  })

  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-stone-900">
        {t('public.datetime.title')}
      </h2>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {days.map((day) => {
          const key = formatDateKey(day)
          const selected = key === selectedDate
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDate(key)}
              className={`shrink-0 rounded-xl px-3 py-2 text-sm font-medium ${
                selected ? `${accent.main} ${accent.mainText}` : 'bg-stone-100 text-stone-600'
              }`}
            >
              {dayFormatter.format(day)}
            </button>
          )
        })}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {data?.slots.map((slot) => (
          <button
            key={slot}
            type="button"
            onClick={() => onSelectSlot(slot)}
            className="rounded-xl border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:border-stone-300"
          >
            {formatTimeFromIso(slot)}
          </button>
        ))}
      </div>
      {data && data.slots.length === 0 && (
        <p className="mt-4 text-stone-400">{t('public.datetime.noSlots')}</p>
      )}

      <div className="mt-8">
        <Button variant="secondary" onClick={onBack}>
          {t('public.datetime.back')}
        </Button>
      </div>
    </div>
  )
}
