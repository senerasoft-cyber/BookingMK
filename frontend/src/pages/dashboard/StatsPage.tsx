import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'

import { ApiError, apiGet } from '../../lib/api'
import type { DashboardContext } from './DashboardLayout'

type Stats = {
  revenue_this_month: number
  currency: string
  appointments_this_month: number
  confirmed_this_month: number
  cancelled_this_month: number
  cancellation_rate: number
  upcoming_count: number
  bookings_by_day: { date: string; count: number }[]
  top_services: { name: string; count: number }[]
}

export default function StatsPage() {
  const { t } = useTranslation()
  const { activeStaffId } = useOutletContext<DashboardContext>()
  const {
    data: stats,
    isError,
    error,
  } = useQuery({
    queryKey: ['stats', activeStaffId],
    queryFn: () => {
      const params = activeStaffId ? `?staff_id=${activeStaffId}` : ''
      return apiGet<Stats>(`/me/stats${params}`, true)
    },
    retry: false,
  })

  if (isError) {
    const message =
      error instanceof ApiError && error.message === 'plan_stats_not_allowed'
        ? t('dashboard.planErrors.plan_stats_not_allowed')
        : t('common.somethingWentWrong')
    return (
      <div>
        <h1 className="font-display text-xl font-semibold text-stone-900">
          {t('dashboard.stats.title')}
        </h1>
        <p className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
          {message}{' '}
          <a href="/dashboard/billing" className="font-medium underline">
            {t('dashboard.planErrors.upgradeLink')}
          </a>
        </p>
      </div>
    )
  }

  if (!stats) {
    return <div className="text-stone-400">…</div>
  }

  const maxDay = Math.max(1, ...stats.bookings_by_day.map((d) => d.count))

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-stone-900">
        {t('dashboard.stats.title')}
      </h1>
      <p className="mt-1 text-stone-500">{t('dashboard.stats.subtitle')}</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500">{t('dashboard.stats.revenue')}</p>
          <p className="mt-1 text-xl font-semibold text-stone-900">
            {stats.revenue_this_month} {stats.currency}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500">{t('dashboard.stats.confirmed')}</p>
          <p className="mt-1 text-xl font-semibold text-stone-900">{stats.confirmed_this_month}</p>
        </div>
        <div className="rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500">{t('dashboard.stats.upcoming')}</p>
          <p className="mt-1 text-xl font-semibold text-stone-900">{stats.upcoming_count}</p>
        </div>
        <div className="rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500">{t('dashboard.stats.cancellationRate')}</p>
          <p className="mt-1 text-xl font-semibold text-stone-900">
            {Math.round(stats.cancellation_rate * 100)}%
          </p>
        </div>
      </div>

      <h2 className="mt-8 text-sm font-medium text-stone-700">{t('dashboard.stats.last14Days')}</h2>
      <div className="mt-3 flex items-end gap-1">
        {stats.bookings_by_day.map((day) => (
          <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-stone-700"
              style={{ height: `${Math.max(4, (day.count / maxDay) * 80)}px` }}
              title={`${day.date}: ${day.count}`}
            />
            <span className="text-[10px] text-stone-400">{day.date.slice(8, 10)}</span>
          </div>
        ))}
      </div>

      <h2 className="mt-8 text-sm font-medium text-stone-700">{t('dashboard.stats.topServices')}</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {stats.top_services.length === 0 && (
          <p className="text-sm text-stone-400">{t('dashboard.stats.empty')}</p>
        )}
        {stats.top_services.map((svc) => (
          <li
            key={svc.name}
            className="flex items-center justify-between rounded-xl border border-stone-200 p-3"
          >
            <span className="font-medium text-stone-800">{svc.name}</span>
            <span className="text-sm text-stone-500">{svc.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
