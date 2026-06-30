import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'

import { Button } from '../../components/Button'
import { useAuth } from '../../context/AuthContext'
import { apiDelete, apiGet, apiPost, apiPut } from '../../lib/api'
import { minutesToTimeInput, timeInputToMinutes } from '../../lib/time'
import type { Staff, StaffTimeOff, WorkingHour } from '../../types'
import type { DashboardContext } from './DashboardLayout'

function VacationSection({ staffId }: { staffId: number }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const queryKey = ['time-off', staffId]
  const { data: timeOff } = useQuery({
    queryKey,
    queryFn: () => apiGet<StaffTimeOff[]>(`/staff/${staffId}/time-off`, true),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey })

  const addRange = async () => {
    if (!startDate || !endDate) return
    setError(null)
    try {
      await apiPost(
        `/staff/${staffId}/time-off`,
        { start_date: startDate, end_date: endDate, note: note || undefined },
        true,
      )
      setStartDate('')
      setEndDate('')
      setNote('')
      invalidate()
    } catch {
      setError(t('dashboard.hours.vacationError'))
    }
  }

  const removeRange = async (id: number) => {
    await apiDelete(`/staff/${staffId}/time-off/${id}`, true)
    invalidate()
  }

  return (
    <div className="mt-8">
      <h2 className="font-medium text-stone-700 dark:text-stone-300">{t('dashboard.hours.vacationTitle')}</h2>
      <p className="text-xs text-stone-400 dark:text-stone-500">{t('dashboard.hours.vacationHint')}</p>

      <div className="mt-3 flex flex-col gap-2">
        {timeOff?.map((range) => (
          <div
            key={range.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-stone-200 p-3 dark:border-stone-700"
          >
            <div>
              <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
                {range.start_date === range.end_date
                  ? range.start_date
                  : `${range.start_date} – ${range.end_date}`}
              </p>
              {range.note && <p className="text-xs text-stone-400 dark:text-stone-500">{range.note}</p>}
            </div>
            <button
              type="button"
              onClick={() => removeRange(range.id)}
              className="text-stone-400 hover:text-red-500 dark:text-stone-500 dark:hover:text-red-400"
              aria-label={t('common.remove')}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {timeOff && timeOff.length === 0 && (
          <p className="text-sm text-stone-400 dark:text-stone-500">{t('dashboard.hours.vacationEmpty')}</p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-stone-700 dark:text-stone-300">{t('dashboard.hours.vacationFrom')}</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-stone-200 px-2 py-1.5 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-stone-700 dark:text-stone-300">{t('dashboard.hours.vacationTo')}</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-stone-200 px-2 py-1.5 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-stone-700 dark:text-stone-300">{t('dashboard.hours.vacationNote')}</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-lg border border-stone-200 px-2 py-1.5 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          />
        </label>
        <Button type="button" variant="secondary" onClick={addRange} disabled={!startDate || !endDate}>
          {t('dashboard.hours.vacationAdd')}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

export default function HoursPage() {
  const { t } = useTranslation()
  const { business } = useAuth()
  const { activeStaffId } = useOutletContext<DashboardContext>()
  const queryClient = useQueryClient()
  const [hours, setHours] = useState<WorkingHour[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const path = activeStaffId ? `/staff/${activeStaffId}/working-hours` : '/working-hours'
  const queryKey = ['working-hours', activeStaffId]

  const { data: staff } = useQuery({
    queryKey: ['staff'],
    queryFn: () => apiGet<Staff[]>('/staff', true),
  })
  const activeStaffName = staff?.find((s) => s.id === activeStaffId)?.name
  const resolvedStaffId = activeStaffId ?? staff?.[0]?.id

  const { data } = useQuery({
    queryKey,
    queryFn: () => apiGet<WorkingHour[]>(path, true),
  })

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed editable copy once data arrives
    setHours(data ?? null)
    setSaved(false)
  }, [data])

  const updateDay = (weekday: number, patch: Partial<WorkingHour>) => {
    setHours((prev) => prev?.map((h) => (h.weekday === weekday ? { ...h, ...patch } : h)) ?? null)
    setSaved(false)
  }

  const save = async () => {
    if (!hours) return
    setSaving(true)
    try {
      await apiPut(path, { hours }, true)
      await queryClient.invalidateQueries({ queryKey })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-stone-900 dark:text-stone-50">
        {t('dashboard.hours.title')}
      </h1>
      <p className="mt-1 text-stone-500 dark:text-stone-400">
        {activeStaffName
          ? t('dashboard.hours.subtitleFor', { name: activeStaffName })
          : t('dashboard.hours.subtitle')}
      </p>

      <div className="mt-6 flex flex-col gap-2">
        {hours?.map((hour) => (
          <div
            key={hour.weekday}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-stone-200 p-3 dark:border-stone-700"
          >
            <span className="w-24 text-sm font-medium text-stone-700 dark:text-stone-300">
              {t(`onboarding.hours.weekdays.${hour.weekday}`)}
            </span>
            <label className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
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
                  className="rounded-lg border border-stone-200 px-2 py-1 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                />
                <span className="text-stone-400 dark:text-stone-500">–</span>
                <input
                  type="time"
                  value={minutesToTimeInput(hour.close_minute)}
                  onChange={(e) =>
                    updateDay(hour.weekday, { close_minute: timeInputToMinutes(e.target.value) })
                  }
                  className="rounded-lg border border-stone-200 px-2 py-1 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                />
                <label className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                  {t('dashboard.hours.slotMinutes')}
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={hour.slot_minutes}
                    onChange={(e) =>
                      updateDay(hour.weekday, { slot_minutes: Number(e.target.value) })
                    }
                    className="w-16 rounded-lg border border-stone-200 px-2 py-1 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                  />
                </label>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button onClick={save} disabled={!hours || saving} accentKey={business?.accent_key}>
          {t('dashboard.settings.save')}
        </Button>
        {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400">{t('dashboard.settings.saved')}</span>}
      </div>

      {resolvedStaffId && <VacationSection staffId={resolvedStaffId} />}
    </div>
  )
}
