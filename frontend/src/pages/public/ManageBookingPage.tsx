import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'

import { Button } from '../../components/Button'
import { ApiError, apiGet, apiPost } from '../../lib/api'

type ManagedAppointment = {
  id: number
  service_name: string
  staff_name: string | null
  starts_at: string
  ends_at: string
  status: 'pending' | 'confirmed' | 'cancelled'
}

export default function ManageBookingPage() {
  const { t } = useTranslation()
  const { slug, token } = useParams<{ slug: string; token: string }>()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [rescheduling, setRescheduling] = useState(false)

  const queryKey = ['managed-appointment', slug, token]
  const {
    data: appointment,
    isPending,
    isError,
  } = useQuery({
    queryKey,
    queryFn: () => apiGet<ManagedAppointment>(`/b/${slug}/manage/${token}`),
  })

  const cancel = async () => {
    setError(null)
    setBusy(true)
    try {
      await apiPost(`/b/${slug}/manage/${token}/cancel`)
      await queryClient.invalidateQueries({ queryKey })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.somethingWentWrong'))
    } finally {
      setBusy(false)
    }
  }

  const move = async () => {
    if (!newDate) return
    setError(null)
    setBusy(true)
    try {
      await apiPost(`/b/${slug}/manage/${token}/move`, { starts_at: `${newDate}:00` })
      await queryClient.invalidateQueries({ queryKey })
      setRescheduling(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.somethingWentWrong'))
    } finally {
      setBusy(false)
    }
  }

  if (isPending) {
    return <div className="flex min-h-screen items-center justify-center text-stone-400">…</div>
  }
  if (isError || !appointment) {
    return (
      <div className="flex min-h-screen items-center justify-center text-stone-500">
        {t('public.manage.notFound')}
      </div>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg shadow-stone-200">
        <h1 className="font-display text-xl font-semibold text-stone-900">
          {t('public.manage.title')}
        </h1>

        <div className="mt-4 rounded-xl border border-stone-200 p-4">
          <p className="font-medium text-stone-900">{appointment.service_name}</p>
          {appointment.staff_name && (
            <p className="text-sm text-stone-500">{appointment.staff_name}</p>
          )}
          <p className="mt-1 text-sm text-stone-500">
            {appointment.starts_at.slice(0, 10)} · {appointment.starts_at.slice(11, 16)}–
            {appointment.ends_at.slice(11, 16)}
          </p>
          <p className="mt-2 text-sm font-medium text-stone-700">
            {t(`public.manage.status.${appointment.status}`)}
          </p>
        </div>

        {appointment.status !== 'cancelled' && (
          <div className="mt-4 flex flex-col gap-3">
            {!rescheduling ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setRescheduling(true)}
                  disabled={busy}
                >
                  {t('public.manage.reschedule')}
                </Button>
                <Button type="button" variant="secondary" onClick={cancel} disabled={busy}>
                  {t('public.manage.cancel')}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-stone-500">{t('public.manage.newTime')}</span>
                  <input
                    type="datetime-local"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="rounded-lg border border-stone-200 px-2 py-1.5"
                  />
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setRescheduling(false)}
                    disabled={busy}
                  >
                    {t('public.datetime.back')}
                  </Button>
                  <Button type="button" onClick={move} disabled={busy || !newDate}>
                    {t('public.manage.confirmReschedule')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </main>
  )
}
