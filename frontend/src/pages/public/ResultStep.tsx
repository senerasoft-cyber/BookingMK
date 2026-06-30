import { CalendarCheck, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../components/Button'
import { getAccent } from '../../theme/accents'
import type { BookingResult } from '../../types'

export default function ResultStep({
  result,
  accentKey,
  onBookAnother,
}: {
  result: BookingResult
  accentKey: string
  onBookAnother: () => void
}) {
  const { t, i18n } = useTranslation()
  const accent = getAccent(accentKey)
  const isConfirmed = result.status === 'confirmed'
  const startsAt = new Date(result.starts_at)
  const formatter = new Intl.DateTimeFormat(i18n.language.startsWith('en') ? 'en-US' : 'mk-MK', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const time = result.starts_at.slice(11, 16)

  return (
    <div className="text-center">
      <div
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
          isConfirmed
            ? `${accent.soft} ${accent.softText}`
            : 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
        }`}
      >
        {isConfirmed ? <CalendarCheck size={28} /> : <Clock size={28} />}
      </div>
      <h2 className="mt-4 font-display text-2xl font-semibold text-stone-900 dark:text-stone-50">
        {isConfirmed ? t('public.result.confirmedTitle') : t('public.result.pendingTitle')}
      </h2>
      <p className="mt-1 text-stone-500 dark:text-stone-400">
        {isConfirmed
          ? t('public.result.confirmedBody', { date: formatter.format(startsAt), time })
          : t('public.result.pendingBody')}
      </p>
      <div className="mt-8">
        <Button accentKey={accentKey} onClick={onBookAnother}>
          {t('public.result.bookAnother')}
        </Button>
      </div>
    </div>
  )
}
