import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Button } from '../../components/Button'
import { useAuth } from '../../context/AuthContext'
import { apiGet, apiPut } from '../../lib/api'
import { advanceOnboarding } from '../../lib/onboarding'
import { minutesToTimeInput, timeInputToMinutes } from '../../lib/time'
import type { WorkingHour } from '../../types'

export default function HoursStep() {
  const { t } = useTranslation()
  const { business, refreshBusiness } = useAuth()
  const navigate = useNavigate()
  const [hours, setHours] = useState<WorkingHour[] | null>(null)
  const [saving, setSaving] = useState(false)

  const { data } = useQuery({
    queryKey: ['working-hours'],
    queryFn: () => apiGet<WorkingHour[]>('/working-hours', true),
  })

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed editable copy once data arrives
    if (data && !hours) setHours(data)
  }, [data, hours])

  const updateDay = (weekday: number, patch: Partial<WorkingHour>) => {
    setHours((prev) => prev?.map((h) => (h.weekday === weekday ? { ...h, ...patch } : h)) ?? null)
  }

  const next = async () => {
    if (!hours) return
    setSaving(true)
    try {
      await apiPut('/working-hours', { hours }, true)
      await advanceOnboarding(refreshBusiness, navigate, 3)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-stone-900">
        {t('onboarding.hours.title')}
      </h2>
      <p className="mt-1 text-stone-500">{t('onboarding.hours.subtitle')}</p>

      <div className="mt-6 flex flex-col gap-2">
        {hours?.map((hour) => (
          <div
            key={hour.weekday}
            className="flex items-center gap-3 rounded-xl border border-stone-200 p-3"
          >
            <span className="w-24 text-sm font-medium text-stone-700">
              {t(`onboarding.hours.weekdays.${hour.weekday}`)}
            </span>
            <label className="flex items-center gap-1.5 text-xs text-stone-500">
              <input
                type="checkbox"
                checked={!hour.is_closed}
                onChange={(e) => updateDay(hour.weekday, { is_closed: !e.target.checked })}
              />
              {hour.is_closed ? t('onboarding.hours.closed') : t('onboarding.hours.open')}
            </label>
            {!hour.is_closed && (
              <>
                <input
                  type="time"
                  value={minutesToTimeInput(hour.open_minute)}
                  onChange={(e) =>
                    updateDay(hour.weekday, { open_minute: timeInputToMinutes(e.target.value) })
                  }
                  className="rounded-lg border border-stone-200 px-2 py-1 text-sm"
                />
                <span className="text-stone-400">–</span>
                <input
                  type="time"
                  value={minutesToTimeInput(hour.close_minute)}
                  onChange={(e) =>
                    updateDay(hour.weekday, { close_minute: timeInputToMinutes(e.target.value) })
                  }
                  className="rounded-lg border border-stone-200 px-2 py-1 text-sm"
                />
              </>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <Button onClick={next} disabled={!hours || saving} accentKey={business?.accent_key}>
          {t('common.next')}
        </Button>
      </div>
    </div>
  )
}
