import { CalendarCheck, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../components/Button'
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
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stone-100">
        {isConfirmed ? (
          <CalendarCheck className="text-stone-700" />
        ) : (
          <Clock className="text-stone-700" />
        )}
      </div>
      <h2 className="mt-4 font-display text-2xl font-semibold text-stone-900">
        {isConfirmed ? t('public.result.confirmedTitle') : t('public.result.pendingTitle')}
      </h2>
      <p className="mt-1 text-stone-500">
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
