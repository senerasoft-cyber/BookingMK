import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, List, Plus, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'

import { Button } from '../../components/Button'
import { useAuth } from '../../context/AuthContext'
import { ApiError, apiGet, apiPost } from '../../lib/api'
import { formatDateKey, nextNDays } from '../../lib/dates'
import { getStaffColor } from '../../lib/staffColors'
import { getAccent } from '../../theme/accents'
import type { Appointment, AppointmentStatus, Plan, Service, Staff } from '../../types'
import type { DashboardContext } from './DashboardLayout'

type StatusFilter = 'all' | AppointmentStatus
type ViewMode = 'list' | 'calendar'

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
  confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  cancelled: 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400',
}

const STATUS_LABEL_KEYS: Record<string, string> = {
  pending: 'dashboard.agenda.statusPending',
  confirmed: 'dashboard.agenda.statusConfirmed',
  cancelled: 'dashboard.agenda.statusCancelled',
}

function toApiDatetime(localValue: string): string {
  // <input type="datetime-local"> gives "YYYY-MM-DDTHH:mm" -- the backend expects seconds too.
  return localValue.length === 16 ? `${localValue}:00` : localValue
}

function AddAppointmentForm({
  staff,
  defaultStaffId,
  accentKey,
  onAdded,
  onClose,
}: {
  staff: Staff[]
  defaultStaffId?: number
  accentKey?: string
  onAdded: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [staffId, setStaffId] = useState<number | undefined>(defaultStaffId ?? staff[0]?.id)
  const [serviceId, setServiceId] = useState<number | undefined>(undefined)
  const [startsAt, setStartsAt] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const servicesPath = staffId ? `/services?staff_id=${staffId}` : '/services'
  const { data: services } = useQuery({
    queryKey: ['services', staffId ?? 'default'],
    queryFn: () => apiGet<Service[]>(servicesPath, true),
  })

  const submit = async () => {
    if (!serviceId || !startsAt || !name) return
    setError(null)
    setBusy(true)
    try {
      await apiPost(
        '/appointments',
        {
          service_id: serviceId,
          staff_id: staffId,
          starts_at: toApiDatetime(startsAt),
          name,
          email: email || undefined,
          phone: phone || undefined,
        },
        true,
      )
      onAdded()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.somethingWentWrong'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-xl border border-stone-200 p-4 dark:border-stone-700">
      {staff.length > 1 && !defaultStaffId && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-stone-500 dark:text-stone-400">{t('dashboard.agenda.staffLabel')}</span>
          <select
            value={staffId ?? ''}
            onChange={(e) => {
              setStaffId(Number(e.target.value))
              setServiceId(undefined)
            }}
            className="rounded-lg border border-stone-200 px-2 py-1.5 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          >
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-stone-500 dark:text-stone-400">{t('dashboard.agenda.serviceLabel')}</span>
        <select
          value={serviceId ?? ''}
          onChange={(e) => setServiceId(Number(e.target.value))}
          className="rounded-lg border border-stone-200 px-2 py-1.5 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
        >
          <option value="" disabled>
            {t('dashboard.agenda.servicePlaceholder')}
          </option>
          {services?.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-stone-500 dark:text-stone-400">{t('dashboard.agenda.startsAtLabel')}</span>
        <input
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          className="rounded-lg border border-stone-200 px-2 py-1.5 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
        />
      </label>

      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-stone-500 dark:text-stone-400">{t('public.details.name')}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-stone-200 px-2 py-1.5 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-stone-500 dark:text-stone-400">{t('public.details.email')}</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('public.details.emailPlaceholder')}
            className="rounded-lg border border-stone-200 px-2 py-1.5 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-stone-500 dark:text-stone-400">{t('public.details.phone')}</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t('public.details.phonePlaceholder')}
            className="rounded-lg border border-stone-200 px-2 py-1.5 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          />
        </label>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          {t('public.datetime.back')}
        </Button>
        <Button
          type="button"
          onClick={submit}
          disabled={busy || !serviceId || !startsAt || !name}
          accentKey={accentKey}
        >
          {t('dashboard.agenda.addAppointmentSubmit')}
        </Button>
      </div>
    </div>
  )
}

function MoveAppointmentForm({
  appointment,
  canAutoNotify,
  onMoved,
  onClose,
}: {
  appointment: Appointment
  canAutoNotify: boolean
  onMoved: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [startsAt, setStartsAt] = useState(appointment.starts_at.slice(0, 16))
  const [notify, setNotify] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setError(null)
    setBusy(true)
    try {
      await apiPost(
        `/appointments/${appointment.id}/move`,
        { starts_at: toApiDatetime(startsAt), notify_client: notify },
        true,
      )
      onMoved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.somethingWentWrong'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg bg-stone-50 p-2.5 dark:bg-stone-900/40">
      <input
        type="datetime-local"
        value={startsAt}
        onChange={(e) => setStartsAt(e.target.value)}
        className="rounded-lg border border-stone-200 px-2 py-1 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
      />
      <label
        className={`flex items-center gap-1.5 text-xs ${canAutoNotify ? 'text-stone-500 dark:text-stone-400' : 'text-stone-300 dark:text-stone-600'}`}
        title={canAutoNotify ? undefined : t('dashboard.planErrors.requiresTop')}
      >
        <input
          type="checkbox"
          checked={notify}
          disabled={!canAutoNotify}
          onChange={(e) => setNotify(e.target.checked)}
        />
        {t('dashboard.agenda.notifyClient')}
        {!canAutoNotify && ` (${t('dashboard.planErrors.requiresTop')})`}
      </label>
      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="rounded-lg bg-stone-800 px-3 py-1 text-sm font-medium text-white dark:bg-stone-700 dark:hover:bg-stone-600"
      >
        {t('dashboard.agenda.confirmMove')}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg px-3 py-1 text-sm font-medium text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
      >
        {t('public.datetime.back')}
      </button>
      {error && <p className="w-full text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

export default function AgendaPage() {
  const { t } = useTranslation()
  const { business } = useAuth()
  const { activeStaffId } = useOutletContext<DashboardContext>()
  const queryClient = useQueryClient()
  const days = nextNDays(14)
  const [dateFrom, setDateFrom] = useState(formatDateKey(days[0]))
  const [dateTo, setDateTo] = useState(formatDateKey(days[6]))
  const [status, setStatus] = useState<StatusFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [addOpen, setAddOpen] = useState(false)
  const [movingId, setMovingId] = useState<number | null>(null)
  const [notifyOnCancel, setNotifyOnCancel] = useState<Record<number, boolean>>({})

  const queryKey = ['appointments', dateFrom, dateTo, status, activeStaffId]
  const { data: appointments } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo })
      if (status !== 'all') params.set('status', status)
      if (activeStaffId) params.set('staff_id', String(activeStaffId))
      return apiGet<Appointment[]>(`/appointments?${params.toString()}`, true)
    },
  })

  const { data: staff } = useQuery({
    queryKey: ['staff'],
    queryFn: () => apiGet<Staff[]>('/staff', true),
  })

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: () => apiGet<Plan[]>('/plans', true),
  })
  const canAutoNotify = plans?.find((p) => p.id === business?.plan_id)?.auto_notify ?? false

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['appointments'] })

  const approve = async (id: number) => {
    await apiPost(`/appointments/${id}/approve`, undefined, true)
    invalidate()
  }
  const cancel = async (id: number) => {
    await apiPost(`/appointments/${id}/cancel`, { notify_client: !!notifyOnCancel[id] }, true)
    invalidate()
  }

  const accent = getAccent(business?.accent_key)

  const calendarDays: Date[] = []
  {
    const cursor = new Date(`${dateFrom}T00:00:00`)
    const end = new Date(`${dateTo}T00:00:00`)
    while (cursor <= end && calendarDays.length < 31) {
      calendarDays.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-stone-900 dark:text-stone-50">
            {t('dashboard.agenda.title')}
          </h1>
          <p className="mt-1 text-stone-500 dark:text-stone-400">{t('dashboard.agenda.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen((open) => !open)}
          className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium ${accent.soft} ${accent.softText}`}
        >
          <Plus size={16} /> {t('dashboard.agenda.addAppointment')}
        </button>
      </div>

      {addOpen && staff && (
        <AddAppointmentForm
          staff={staff.filter((s) => s.active)}
          defaultStaffId={activeStaffId ?? undefined}
          accentKey={business?.accent_key}
          onAdded={() => {
            setAddOpen(false)
            invalidate()
          }}
          onClose={() => setAddOpen(false)}
        />
      )}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-stone-500 dark:text-stone-400">{t('dashboard.agenda.dateFrom')}</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-stone-200 px-2 py-1 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-stone-500 dark:text-stone-400">{t('dashboard.agenda.dateTo')}</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-stone-200 px-2 py-1 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          />
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          className="rounded-lg border border-stone-200 px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
        >
          <option value="all">{t('dashboard.agenda.statusAll')}</option>
          <option value="pending">{t('dashboard.agenda.statusPending')}</option>
          <option value="confirmed">{t('dashboard.agenda.statusConfirmed')}</option>
          <option value="cancelled">{t('dashboard.agenda.statusCancelled')}</option>
        </select>

        <div className="flex rounded-lg border border-stone-200 p-0.5 dark:border-stone-700">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-sm font-medium ${
              viewMode === 'list' ? `${accent.soft} ${accent.softText}` : 'text-stone-500 dark:text-stone-400'
            }`}
          >
            <List size={14} /> {t('dashboard.agenda.viewList')}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-sm font-medium ${
              viewMode === 'calendar' ? `${accent.soft} ${accent.softText}` : 'text-stone-500 dark:text-stone-400'
            }`}
          >
            <CalendarDays size={14} /> {t('dashboard.agenda.viewCalendar')}
          </button>
        </div>
      </div>

      {staff && staff.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-3">
          {staff.map((member) => (
            <span key={member.id} className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
              <span className={`h-2.5 w-2.5 rounded-full ${getStaffColor(member.id).dot}`} />
              {member.name}
            </span>
          ))}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="mt-4 flex flex-col gap-2">
          {appointments?.map((appt) => (
            <div key={appt.id} className="rounded-xl border border-stone-200 p-3 dark:border-stone-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="flex items-center gap-2 font-medium text-stone-900 dark:text-stone-50">
                    {appt.starts_at.slice(0, 10)} · {appt.starts_at.slice(11, 16)}–
                    {appt.ends_at.slice(11, 16)}
                    {appt.staff_name && staff && staff.length > 1 && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStaffColor(appt.staff_id).bg} ${getStaffColor(appt.staff_id).text}`}
                      >
                        {appt.staff_name}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    {appt.service_name} — {appt.client.name} (
                    {appt.client.email ?? appt.client.phone_e164 ?? t('dashboard.agenda.noContact')}
                    )
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {appt.flagged_for_review && (
                    <span
                      className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-950/30 dark:text-red-400"
                      title={t('dashboard.agenda.flaggedHint')}
                    >
                      <TriangleAlert size={12} />
                      {t('dashboard.agenda.flagged')}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[appt.status]}`}
                  >
                    {t(STATUS_LABEL_KEYS[appt.status])}
                  </span>
                  {appt.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => approve(appt.id)}
                      className={`rounded-lg px-3 py-1 text-sm font-medium ${accent.soft} ${accent.softText}`}
                    >
                      {t('dashboard.agenda.approve')}
                    </button>
                  )}
                  {appt.status !== 'cancelled' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setMovingId(movingId === appt.id ? null : appt.id)}
                        className="rounded-lg px-3 py-1 text-sm font-medium text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
                      >
                        {t('dashboard.agenda.move')}
                      </button>
                      <label
                        className="flex items-center gap-1 text-xs text-stone-400 dark:text-stone-500"
                        title={canAutoNotify ? undefined : t('dashboard.planErrors.requiresTop')}
                      >
                        <input
                          type="checkbox"
                          checked={!!notifyOnCancel[appt.id]}
                          disabled={!canAutoNotify}
                          onChange={(e) =>
                            setNotifyOnCancel((prev) => ({ ...prev, [appt.id]: e.target.checked }))
                          }
                        />
                        {t('dashboard.agenda.notifyClient')}
                        {!canAutoNotify && ` (${t('dashboard.planErrors.requiresTop')})`}
                      </label>
                      <button
                        type="button"
                        onClick={() => cancel(appt.id)}
                        className="rounded-lg px-3 py-1 text-sm font-medium text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
                      >
                        {t('dashboard.agenda.cancel')}
                      </button>
                    </>
                  )}
                </div>
              </div>
              {movingId === appt.id && (
                <MoveAppointmentForm
                  appointment={appt}
                  canAutoNotify={canAutoNotify}
                  onMoved={() => {
                    setMovingId(null)
                    invalidate()
                  }}
                  onClose={() => setMovingId(null)}
                />
              )}
            </div>
          ))}
          {appointments && appointments.length === 0 && (
            <p className="text-stone-400 dark:text-stone-500">{t('dashboard.agenda.empty')}</p>
          )}
        </div>
      )}

      {viewMode === 'calendar' && (
        <div className="mt-4 overflow-x-auto">
          <div className="flex min-w-full gap-2">
            {calendarDays.map((day) => {
              const dayKey = formatDateKey(day)
              const dayAppointments = (appointments ?? [])
                .filter((a) => a.starts_at.slice(0, 10) === dayKey)
                .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
              return (
                <div key={dayKey} className="flex w-40 shrink-0 flex-col gap-2">
                  <p className="text-center text-xs font-medium text-stone-500 dark:text-stone-400">
                    {day.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                  </p>
                  <div className="flex min-h-[4rem] flex-col gap-1.5 rounded-xl border border-stone-200 bg-stone-50 p-1.5 dark:border-stone-700 dark:bg-stone-900/40">
                    {dayAppointments.map((appt) => (
                      <div
                        key={appt.id}
                        className={`rounded-lg border-l-4 p-1.5 text-xs ${getStaffColor(appt.staff_id).bg} ${getStaffColor(appt.staff_id).text}`}
                        style={{ borderLeftColor: 'currentColor' }}
                        title={`${appt.service_name} — ${appt.client.name}`}
                      >
                        <p className="font-semibold">{appt.starts_at.slice(11, 16)}</p>
                        <p className="truncate">{appt.client.name}</p>
                        <p className="truncate opacity-80">{appt.service_name}</p>
                      </div>
                    ))}
                    {dayAppointments.length === 0 && (
                      <p className="py-2 text-center text-xs text-stone-300 dark:text-stone-600">·</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
