import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Building2, CalendarClock, Globe, ShieldCheck, Tag, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'

import { Button } from '../../components/Button'
import { TextInput } from '../../components/TextInput'
import { BOOKING_MODES } from '../../constants/bookingOptions'
import { useAuth } from '../../context/AuthContext'
import { ApiError, apiGet, apiPatch, apiPost } from '../../lib/api'
import { setTokens } from '../../lib/tokens'
import type { Business, BookingMode, Staff } from '../../types'
import type { DashboardContext } from './DashboardLayout'

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <Icon size={16} className="text-stone-400 dark:text-stone-500" />
        <h2 className="font-display text-sm font-semibold text-stone-700 dark:text-stone-200">{title}</h2>
      </div>
      {description && <p className="mb-3 text-xs text-stone-400 dark:text-stone-500">{description}</p>}
      <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
        {children}
      </div>
    </section>
  )
}

function MyPinSection() {
  const { t } = useTranslation()
  const { activeStaffId } = useOutletContext<DashboardContext>()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const { data: staff } = useQuery({
    queryKey: ['staff'],
    queryFn: () => apiGet<Staff[]>('/staff', true),
  })
  const activeStaff = staff?.find((s) => s.id === activeStaffId)

  if (!activeStaffId || !activeStaff) {
    return (
      <div className="border-t border-stone-200 pt-4 first:border-t-0 first:pt-0 dark:border-stone-800">
        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">{t('dashboard.settings.myPin')}</h3>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{t('dashboard.settings.myPinSwitchHint')}</p>
      </div>
    )
  }

  const submit = async () => {
    setError(null)
    setBusy(true)
    try {
      await apiPatch(`/staff/${activeStaffId}/pin`, { pin, confirm_pin: confirmPin }, true)
      await queryClient.invalidateQueries({ queryKey: ['staff'] })
      setEditing(false)
      setPin('')
      setConfirmPin('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.somethingWentWrong'))
    } finally {
      setBusy(false)
    }
  }

  const clear = async () => {
    setBusy(true)
    try {
      await apiPost(`/staff/${activeStaffId}/reset-pin`, undefined, true)
      await queryClient.invalidateQueries({ queryKey: ['staff'] })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border-t border-stone-200 pt-4 first:border-t-0 first:pt-0 dark:border-stone-800">
      <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
        {t('dashboard.settings.myPin')} — {activeStaff.name}
      </h3>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{t('dashboard.settings.myPinHint')}</p>

      {!editing ? (
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm font-medium text-stone-600 underline dark:text-stone-300"
          >
            {activeStaff.pin_set
              ? t('dashboard.settings.changePin')
              : t('dashboard.settings.setUpPin')}
          </button>
          {activeStaff.pin_set && (
            <button
              type="button"
              onClick={clear}
              disabled={busy}
              className="text-sm font-medium text-stone-400 underline hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
            >
              {t('dashboard.settings.removePin')}
            </button>
          )}
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-stone-500 dark:text-stone-400">{t('dashboard.settings.pin')}</span>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              inputMode="numeric"
              maxLength={6}
              className="rounded-lg border border-stone-200 px-2 py-1.5 tracking-widest dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-stone-500 dark:text-stone-400">{t('dashboard.settings.confirmPin')}</span>
            <input
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              inputMode="numeric"
              maxLength={6}
              className="rounded-lg border border-stone-200 px-2 py-1.5 tracking-widest dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            />
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={busy || pin.length < 4 || pin !== confirmPin}
            className="rounded-lg bg-stone-800 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-stone-700 dark:hover:bg-stone-600"
          >
            {t('dashboard.settings.save')}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            {t('public.datetime.back')}
          </button>
          {error && <p className="w-full text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )}
    </div>
  )
}

function ChangePasswordSection() {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setError(null)
    setBusy(true)
    try {
      const data = await apiPatch<{ access_token: string; refresh_token: string }>(
        '/me/password',
        { current_password: currentPassword, new_password: newPassword },
        true,
      )
      setTokens(data.access_token, data.refresh_token)
      setCurrentPassword('')
      setNewPassword('')
      setEditing(false)
      setSaved(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.somethingWentWrong'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border-t border-stone-200 pt-4 first:border-t-0 first:pt-0 dark:border-stone-800">
      <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
        {t('dashboard.settings.changePassword')}
      </h3>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        {t('dashboard.settings.changePasswordHint')}
      </p>

      {!editing ? (
        <button
          type="button"
          onClick={() => {
            setEditing(true)
            setSaved(false)
          }}
          className="mt-2 text-sm font-medium text-stone-600 underline dark:text-stone-300"
        >
          {t('dashboard.settings.changePassword')}
        </button>
      ) : (
        <div className="mt-3 flex max-w-xs flex-col gap-2">
          <TextInput
            label={t('dashboard.settings.currentPassword')}
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <TextInput
            label={t('dashboard.settings.newPassword')}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={busy || !currentPassword || newPassword.length < 10}
              className="rounded-lg bg-stone-800 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-stone-700 dark:hover:bg-stone-600"
            >
              {t('dashboard.settings.save')}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
            >
              {t('public.datetime.back')}
            </button>
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )}
      {saved && !editing && (
        <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
          {t('dashboard.settings.passwordChanged')}
        </p>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const { t } = useTranslation()
  const { business, refreshBusiness } = useAuth()
  const [form, setForm] = useState({
    name: business?.name ?? '',
    slug: business?.slug ?? '',
    currency: business?.currency ?? 'MKD',
    locale_default: business?.locale_default ?? 'mk',
    booking_mode: business?.booking_mode ?? ('open' as BookingMode),
    require_verification: business?.require_verification ?? false,
    collect_phone: business?.collect_phone ?? false,
    reminders_enabled: business?.reminders_enabled ?? true,
    reminder_lead_minutes: business?.reminder_lead_minutes ?? 1440,
    address: business?.address ?? '',
    about_text: business?.about_text ?? '',
    contact_phone: business?.contact_phone ?? '',
    instagram_url: business?.instagram_url ?? '',
    facebook_url: business?.facebook_url ?? '',
    website_url: business?.website_url ?? '',
    marketing_enabled: business?.marketing_enabled ?? false,
    loyalty_enabled: business?.loyalty_enabled ?? false,
    loyalty_every_n: business?.loyalty_every_n ?? 10,
  })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await apiPatch<Business>('/me/business', form, true)
      await refreshBusiness()
      setSaved(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.somethingWentWrong'))
    } finally {
      setSaving(false)
    }
  }

  const reminderHours = Math.floor(form.reminder_lead_minutes / 60)
  const reminderMinutes = form.reminder_lead_minutes % 60
  const updateReminderLead = (hours: number, minutes: number) => {
    const safeHours = Number.isFinite(hours) ? Math.max(0, hours) : 0
    const safeMinutes = Number.isFinite(minutes) ? Math.max(0, Math.min(59, minutes)) : 0
    update('reminder_lead_minutes', safeHours * 60 + safeMinutes)
  }

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-stone-900 dark:text-stone-50">
        {t('dashboard.settings.title')}
      </h1>
      <p className="mt-1 text-stone-500 dark:text-stone-400">{t('dashboard.settings.subtitle')}</p>

      <div className="mt-6 flex max-w-2xl flex-col gap-6">
        <SettingsSection icon={Building2} title={t('dashboard.settings.sectionBusiness')}>
          <TextInput
            label={t('dashboard.settings.businessName')}
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
          />
          <div>
            <TextInput
              label={t('dashboard.settings.slug')}
              value={form.slug}
              onChange={(e) => update('slug', e.target.value)}
            />
            <p className="mt-1.5 text-xs text-stone-400 dark:text-stone-500">
              {t('dashboard.settings.slugHint', { slug: form.slug })}
            </p>
          </div>
          <TextInput
            label={t('dashboard.settings.currency')}
            value={form.currency}
            onChange={(e) => update('currency', e.target.value)}
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
              {t('dashboard.settings.locale')}
            </span>
            <select
              value={form.locale_default}
              onChange={(e) => update('locale_default', e.target.value)}
              className="rounded-xl border border-stone-200 px-4 py-2.5 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-stone-500 dark:focus:ring-stone-700"
            >
              <option value="mk">Македонски</option>
              <option value="en">English</option>
            </select>
          </label>
        </SettingsSection>

        <SettingsSection icon={CalendarClock} title={t('dashboard.settings.sectionBooking')}>
          <div className="flex flex-col gap-2">
            {BOOKING_MODES.map((mode) => (
              <label
                key={mode.value}
                className={`flex cursor-pointer flex-col rounded-xl border p-3 ${
                  form.booking_mode === mode.value
                    ? 'border-stone-400 bg-stone-50 dark:border-stone-500 dark:bg-stone-900/40'
                    : 'border-stone-200 dark:border-stone-700'
                }`}
              >
                <span className="flex items-center gap-2 font-medium text-stone-800 dark:text-stone-200">
                  <input
                    type="radio"
                    checked={form.booking_mode === mode.value}
                    onChange={() => update('booking_mode', mode.value)}
                  />
                  {t(mode.labelKey)}
                </span>
                <span className="ml-6 text-sm text-stone-500 dark:text-stone-400">{t(mode.descriptionKey)}</span>
              </label>
            ))}
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300">
              <input
                type="checkbox"
                checked={form.require_verification}
                onChange={(e) => update('require_verification', e.target.checked)}
              />
              {t('onboarding.mode.requireVerification')}
            </label>
            <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
              {t('onboarding.mode.requireVerificationHint')}
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300">
              <input
                type="checkbox"
                checked={form.collect_phone}
                onChange={(e) => update('collect_phone', e.target.checked)}
              />
              {t('onboarding.mode.collectPhone')}
            </label>
            <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">{t('onboarding.mode.collectPhoneHint')}</p>
          </div>
        </SettingsSection>

        <SettingsSection icon={Bell} title={t('dashboard.settings.sectionReminders')}>
          <label className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300">
            <input
              type="checkbox"
              checked={form.reminders_enabled}
              onChange={(e) => update('reminders_enabled', e.target.checked)}
            />
            {t('dashboard.settings.remindersEnabled')}
          </label>

          {form.reminders_enabled && (
            <div>
              <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
                {t('dashboard.settings.reminderLeadMinutes')}
              </span>
              <div className="mt-1.5 flex items-end gap-2">
                <TextInput
                  label={t('dashboard.settings.reminderLeadHoursLabel')}
                  type="number"
                  min={0}
                  className="w-24"
                  value={reminderHours}
                  onChange={(e) => updateReminderLead(Number(e.target.value), reminderMinutes)}
                />
                <TextInput
                  label={t('dashboard.settings.reminderLeadMinutesLabel')}
                  type="number"
                  min={0}
                  max={59}
                  className="w-24"
                  value={reminderMinutes}
                  onChange={(e) => updateReminderLead(reminderHours, Number(e.target.value))}
                />
              </div>
              <p className="mt-1.5 text-xs text-stone-400 dark:text-stone-500">
                {t('dashboard.settings.reminderLeadHint')}
              </p>
            </div>
          )}
        </SettingsSection>

        <SettingsSection icon={Globe} title={t('dashboard.settings.publicPage')} description={t('dashboard.settings.publicPageHint')}>
          <TextInput
            label={t('dashboard.settings.address')}
            value={form.address}
            onChange={(e) => update('address', e.target.value)}
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
              {t('dashboard.settings.aboutText')}
            </span>
            <textarea
              value={form.about_text}
              onChange={(e) => update('about_text', e.target.value)}
              rows={4}
              className="rounded-xl border border-stone-200 px-4 py-2.5 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-stone-500 dark:focus:ring-stone-700"
            />
          </label>
          <TextInput
            label={t('dashboard.settings.contactPhone')}
            placeholder="+389 70 123 456"
            value={form.contact_phone}
            onChange={(e) => update('contact_phone', e.target.value)}
          />
          <TextInput
            label={t('dashboard.settings.instagramUrl')}
            placeholder="https://instagram.com/yourbusiness"
            value={form.instagram_url}
            onChange={(e) => update('instagram_url', e.target.value)}
          />
          <TextInput
            label={t('dashboard.settings.facebookUrl')}
            placeholder="https://facebook.com/yourbusiness"
            value={form.facebook_url}
            onChange={(e) => update('facebook_url', e.target.value)}
          />
          <TextInput
            label={t('dashboard.settings.websiteUrl')}
            placeholder="https://yourbusiness.com"
            value={form.website_url}
            onChange={(e) => update('website_url', e.target.value)}
          />
        </SettingsSection>

        <SettingsSection icon={Tag} title={t('dashboard.settings.marketing')} description={t('dashboard.settings.marketingHint')}>
          <label className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300">
            <input
              type="checkbox"
              checked={form.marketing_enabled}
              onChange={(e) => update('marketing_enabled', e.target.checked)}
            />
            {t('dashboard.settings.marketingEnabled')}
          </label>

          {form.marketing_enabled && (
            <>
              <label className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300">
                <input
                  type="checkbox"
                  checked={form.loyalty_enabled}
                  onChange={(e) => update('loyalty_enabled', e.target.checked)}
                />
                {t('dashboard.settings.loyaltyEnabled')}
              </label>
              {form.loyalty_enabled && (
                <TextInput
                  label={t('dashboard.settings.loyaltyEveryN')}
                  type="number"
                  min={2}
                  max={100}
                  className="max-w-[10rem]"
                  value={form.loyalty_every_n}
                  onChange={(e) => update('loyalty_every_n', Number(e.target.value))}
                />
              )}
            </>
          )}
        </SettingsSection>

        <SettingsSection icon={ShieldCheck} title={t('dashboard.settings.sectionAccount')}>
          <ChangePasswordSection />
          <MyPinSection />
        </SettingsSection>

        <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <Button onClick={save} disabled={saving} accentKey={business?.accent_key}>
            {t('dashboard.settings.save')}
          </Button>
          {saved && (
            <span className="text-sm text-emerald-600 dark:text-emerald-400">{t('dashboard.settings.saved')}</span>
          )}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  )
}
