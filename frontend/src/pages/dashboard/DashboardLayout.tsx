import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  CalendarDays,
  Clock,
  CreditCard,
  LogOut,
  Palette,
  ScissorsLineDashed,
  Settings,
  SquareUser,
  Tag,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, NavLink, Outlet } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import { ApiError, apiGet, apiPost } from '../../lib/api'
import { getAccent } from '../../theme/accents'
import type { Staff } from '../../types'

export type DashboardContext = { activeStaffId: number | null }

function pinErrorMessage(t: (key: string) => string, err: unknown): string {
  if (err instanceof ApiError) {
    const key = `dashboard.staffSwitcher.errors.${err.message}`
    const translated = t(key)
    return translated === key ? t('dashboard.staffSwitcher.errors.generic') : translated
  }
  return t('dashboard.staffSwitcher.errors.generic')
}

// Most-used screens first, day-to-day setup-once screens at the bottom.
const NAV_ITEMS = [
  { to: '/dashboard', labelKey: 'dashboard.nav.agenda', icon: CalendarDays, end: true },
  { to: '/dashboard/services', labelKey: 'dashboard.nav.services', icon: ScissorsLineDashed },
  { to: '/dashboard/clients', labelKey: 'dashboard.nav.clients', icon: SquareUser },
  { to: '/dashboard/hours', labelKey: 'dashboard.nav.hours', icon: Clock },
  { to: '/dashboard/staff', labelKey: 'dashboard.nav.staff', icon: Users },
  { to: '/dashboard/stats', labelKey: 'dashboard.nav.stats', icon: BarChart3 },
  {
    to: '/dashboard/marketing',
    labelKey: 'dashboard.nav.marketing',
    icon: Tag,
    requiresMarketing: true,
  },
  { to: '/dashboard/branding', labelKey: 'dashboard.nav.branding', icon: Palette },
  { to: '/dashboard/billing', labelKey: 'dashboard.nav.billing', icon: CreditCard },
  { to: '/dashboard/settings', labelKey: 'dashboard.nav.settings', icon: Settings },
]

function StaffSwitcher({
  staff,
  activeStaffId,
  onChange,
}: {
  staff: Staff[]
  activeStaffId: number | null
  onChange: (id: number | null) => void
}) {
  const { t } = useTranslation()
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (staff.length <= 1) return null

  const select = async (member: Staff | null) => {
    setError(null)
    if (member === null || !member.pin_set) {
      onChange(member?.id ?? null)
      return
    }
    setPendingId(member.id)
  }

  const submitPin = async () => {
    if (pendingId === null) return
    setBusy(true)
    setError(null)
    try {
      await apiPost(`/staff/${pendingId}/pin/verify`, { pin }, true)
      onChange(pendingId)
      setPendingId(null)
      setPin('')
    } catch (err) {
      setError(pinErrorMessage(t, err))
    } finally {
      setBusy(false)
    }
  }

  if (pendingId !== null) {
    const member = staff.find((s) => s.id === pendingId)
    return (
      <div className="rounded-xl border border-stone-200 p-3">
        <label className="flex flex-col gap-1" htmlFor="staff-switcher-pin">
          <span className="text-sm font-medium text-stone-700">{member?.name}</span>
          <input
            id="staff-switcher-pin"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            inputMode="numeric"
            maxLength={6}
            autoFocus
            aria-label={t('dashboard.staffSwitcher.pinPlaceholder')}
            placeholder={t('dashboard.staffSwitcher.pinPlaceholder')}
            className="mt-2 w-full rounded-lg border border-stone-200 px-2 py-1.5 tracking-widest"
          />
        </label>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setPendingId(null)
              setPin('')
              setError(null)
            }}
            className="flex-1 rounded-lg px-2 py-1 text-xs font-medium text-stone-500 hover:bg-stone-100"
          >
            {t('public.datetime.back')}
          </button>
          <button
            type="button"
            onClick={submitPin}
            disabled={busy || pin.length < 4}
            className="flex-1 rounded-lg bg-stone-800 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            {t('dashboard.staffSwitcher.unlock')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium text-stone-500">{t('dashboard.staffSwitcher.viewingAs')}</span>
      <select
        value={activeStaffId ?? ''}
        onChange={(e) => {
          const id = e.target.value ? Number(e.target.value) : null
          select(id === null ? null : (staff.find((s) => s.id === id) ?? null))
        }}
        className="rounded-lg border border-stone-200 px-2 py-1.5 text-sm"
      >
        <option value="">{t('dashboard.staffSwitcher.allStaff')}</option>
        {staff.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
            {member.pin_set ? ` (${t('dashboard.staffSwitcher.locked')})` : ''}
          </option>
        ))}
      </select>
    </label>
  )
}

export default function DashboardLayout() {
  const { t } = useTranslation()
  const { business, logout } = useAuth()
  const [activeStaffId, setActiveStaffId] = useState<number | null>(null)

  const { data: staff } = useQuery({
    queryKey: ['staff'],
    queryFn: () => apiGet<Staff[]>('/staff', true),
    enabled: !!business?.onboarding_completed_at,
  })

  if (!business) return null
  if (!business.onboarding_completed_at) {
    return <Navigate to="/onboarding" replace />
  }
  if (!staff) {
    return <div className="flex min-h-screen items-center justify-center text-stone-400">…</div>
  }

  const accent = getAccent(business.accent_key)
  const publicUrl = `/b/${business.slug}`

  return (
    <div className={`min-h-screen ${accent.canvas}`}>
      <div className="mx-auto flex max-w-5xl gap-6 px-6 py-8">
        <aside className="w-56 shrink-0">
          <p className="mb-4 px-2 font-display text-lg font-semibold text-stone-900">
            {business.name}
          </p>

          <div className="mb-4 px-2">
            <StaffSwitcher
              staff={staff}
              activeStaffId={activeStaffId}
              onChange={setActiveStaffId}
            />
          </div>

          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.filter((item) => !item.requiresMarketing || business.marketing_enabled).map(
              ({ to, labelKey, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    isActive ? `${accent.main} ${accent.mainText}` : 'text-stone-600 hover:bg-white'
                  }`
                }
              >
                <Icon size={18} />
                {t(labelKey)}
              </NavLink>
            ))}
          </nav>

          <div className="mt-6 flex flex-col gap-1 border-t border-stone-200 pt-4">
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl px-3 py-2 text-sm font-medium text-stone-600 hover:bg-white"
            >
              {t('dashboard.nav.viewPublicPage')}
            </a>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-stone-600 hover:bg-white"
            >
              <LogOut size={18} />
              {t('dashboard.nav.logout')}
            </button>
          </div>
        </aside>

        <main className="flex-1 rounded-2xl bg-white p-6 shadow-lg shadow-stone-200">
          <Outlet context={{ activeStaffId } satisfies DashboardContext} />
        </main>
      </div>
    </div>
  )
}
