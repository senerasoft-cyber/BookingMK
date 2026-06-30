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

import { ThemeToggle } from '../../components/ThemeToggle'
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

type NavItem = {
  to: string
  labelKey: string
  icon: typeof CalendarDays
  end?: boolean
  requiresMarketing?: boolean
  group: 'dayToDay' | 'setup'
}

// Grouped so day-to-day screens are visually separated from setup-once screens.
const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', labelKey: 'dashboard.nav.agenda', icon: CalendarDays, end: true, group: 'dayToDay' },
  { to: '/dashboard/services', labelKey: 'dashboard.nav.services', icon: ScissorsLineDashed, group: 'dayToDay' },
  { to: '/dashboard/clients', labelKey: 'dashboard.nav.clients', icon: SquareUser, group: 'dayToDay' },
  { to: '/dashboard/stats', labelKey: 'dashboard.nav.stats', icon: BarChart3, group: 'dayToDay' },
  { to: '/dashboard/hours', labelKey: 'dashboard.nav.hours', icon: Clock, group: 'setup' },
  { to: '/dashboard/staff', labelKey: 'dashboard.nav.staff', icon: Users, group: 'setup' },
  {
    to: '/dashboard/marketing',
    labelKey: 'dashboard.nav.marketing',
    icon: Tag,
    requiresMarketing: true,
    group: 'setup',
  },
  { to: '/dashboard/branding', labelKey: 'dashboard.nav.branding', icon: Palette, group: 'setup' },
  { to: '/dashboard/billing', labelKey: 'dashboard.nav.billing', icon: CreditCard, group: 'setup' },
  { to: '/dashboard/settings', labelKey: 'dashboard.nav.settings', icon: Settings, group: 'setup' },
]

const NAV_GROUPS: { labelKey: string | null; group: 'dayToDay' | 'setup' }[] = [
  { labelKey: null, group: 'dayToDay' },
  { labelKey: 'dashboard.nav.setupGroup', group: 'setup' },
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
      <div className="rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-800">
        <label className="flex flex-col gap-1" htmlFor="staff-switcher-pin">
          <span className="text-sm font-medium text-stone-700 dark:text-stone-200">{member?.name}</span>
          <input
            id="staff-switcher-pin"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            inputMode="numeric"
            maxLength={6}
            autoFocus
            aria-label={t('dashboard.staffSwitcher.pinPlaceholder')}
            placeholder={t('dashboard.staffSwitcher.pinPlaceholder')}
            className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 tracking-widest text-stone-900 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
          />
        </label>
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setPendingId(null)
              setPin('')
              setError(null)
            }}
            className="flex-1 rounded-lg px-2 py-1 text-xs font-medium text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-700"
          >
            {t('public.datetime.back')}
          </button>
          <button
            type="button"
            onClick={submitPin}
            disabled={busy || pin.length < 4}
            className="flex-1 rounded-lg bg-stone-800 px-2 py-1 text-xs font-medium text-white disabled:opacity-50 dark:bg-stone-600"
          >
            {t('dashboard.staffSwitcher.unlock')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium text-stone-500 dark:text-stone-400">{t('dashboard.staffSwitcher.viewingAs')}</span>
      <select
        value={activeStaffId ?? ''}
        onChange={(e) => {
          const id = e.target.value ? Number(e.target.value) : null
          select(id === null ? null : (staff.find((s) => s.id === id) ?? null))
        }}
        className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
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
    return (
      <div className="flex min-h-screen items-center justify-center text-stone-400 dark:bg-stone-950 dark:text-stone-500">
        …
      </div>
    )
  }

  const accent = getAccent(business.accent_key)
  const publicUrl = `/b/${business.slug}`

  return (
    <div className={`min-h-screen ${accent.canvas}`}>
      <div className="mx-auto flex max-w-5xl gap-6 px-6 py-8">
        <aside className="w-56 shrink-0">
          <div className="mb-4 flex items-center justify-between px-2">
            <p className="truncate font-display text-lg font-semibold text-stone-900 dark:text-stone-50">
              {business.name}
            </p>
            <ThemeToggle className="shrink-0" />
          </div>

          <div className="mb-4 px-2">
            <StaffSwitcher
              staff={staff}
              activeStaffId={activeStaffId}
              onChange={setActiveStaffId}
            />
          </div>

          <nav className="flex flex-col gap-4">
            {NAV_GROUPS.map((group) => {
              const items = NAV_ITEMS.filter(
                (item) => item.group === group.group && (!item.requiresMarketing || business.marketing_enabled),
              )
              if (items.length === 0) return null
              return (
                <div key={group.group} className="flex flex-col gap-1">
                  {group.labelKey && (
                    <p className="px-3 text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
                      {t(group.labelKey)}
                    </p>
                  )}
                  {items.map(({ to, labelKey, icon: Icon, end }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      className={({ isActive }) =>
                        `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                          isActive
                            ? `${accent.main} ${accent.mainText}`
                            : 'text-stone-600 hover:bg-white dark:text-stone-300 dark:hover:bg-stone-800/60'
                        }`
                      }
                    >
                      <Icon size={18} />
                      {t(labelKey)}
                    </NavLink>
                  ))}
                </div>
              )
            })}
          </nav>

          <div className="mt-6 flex flex-col gap-1 border-t border-stone-200 pt-4 dark:border-stone-800">
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl px-3 py-2 text-sm font-medium text-stone-600 hover:bg-white dark:text-stone-300 dark:hover:bg-stone-800/60"
            >
              {t('dashboard.nav.viewPublicPage')}
            </a>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-stone-600 hover:bg-white dark:text-stone-300 dark:hover:bg-stone-800/60"
            >
              <LogOut size={18} />
              {t('dashboard.nav.logout')}
            </button>
          </div>
        </aside>

        <main className="flex-1 rounded-2xl bg-white p-6 shadow-lg shadow-stone-200 dark:bg-stone-900 dark:shadow-none dark:ring-1 dark:ring-stone-800">
          <Outlet context={{ activeStaffId } satisfies DashboardContext} />
        </main>
      </div>
    </div>
  )
}
