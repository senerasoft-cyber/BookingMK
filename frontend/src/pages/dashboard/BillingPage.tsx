import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../components/Button'
import { TextInput } from '../../components/TextInput'
import { useAuth } from '../../context/AuthContext'
import { ApiError, apiGet, apiPost } from '../../lib/api'
import type { Plan } from '../../types'

const FEATURE_KEYS: { key: keyof Plan; labelKey: string }[] = [
  { key: 'stats', labelKey: 'onboarding.billing.featureStats' },
  { key: 'marketing_tools', labelKey: 'onboarding.billing.featureMarketingTools' },
  { key: 'white_label', labelKey: 'onboarding.billing.featureWhiteLabel' },
]

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  past_due: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
  canceled: 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400',
  none: 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400',
}

function promoErrorMessage(t: (key: string) => string, err: unknown): string {
  if (err instanceof ApiError) {
    const key = `dashboard.billing.promoErrors.${err.message}`
    const translated = t(key)
    return translated === key ? t('common.somethingWentWrong') : translated
  }
  return t('common.somethingWentWrong')
}

function PromoCodeForm({ onRedeemed }: { onRedeemed: () => void }) {
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const redeem = async () => {
    setError(null)
    setBusy(true)
    try {
      await apiPost('/me/subscription/redeem-promo', { code }, true)
      setCode('')
      onRedeemed()
    } catch (err) {
      setError(promoErrorMessage(t, err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-stone-300 p-3 dark:border-stone-700">
      <TextInput
        label={t('dashboard.billing.promoCode')}
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="ABCD1234"
      />
      <Button type="button" variant="secondary" onClick={redeem} disabled={busy || !code}>
        {t('dashboard.billing.promoRedeem')}
      </Button>
      {error && <p className="w-full text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

export default function BillingPage() {
  const { t } = useTranslation()
  const { business, refreshBusiness } = useAuth()
  const queryClient = useQueryClient()
  const [interval, setInterval] = useState<'monthly' | 'yearly'>(
    business?.billing_interval === 'yearly' ? 'yearly' : 'monthly',
  )
  const isYearly = interval === 'yearly'
  const [busyPlan, setBusyPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: () => apiGet<Plan[]>('/plans', true),
  })

  const subscribe = async (planId: string) => {
    setError(null)
    setBusyPlan(planId)
    try {
      const result = await apiPost<{ checkout_url?: string | null }>(
        '/me/subscription/checkout',
        { plan_id: planId, interval },
        true,
      )
      if (result.checkout_url) {
        window.location.assign(result.checkout_url)
        return
      }
      await refreshBusiness()
      await queryClient.invalidateQueries({ queryKey: ['staff'] })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.somethingWentWrong'))
    } finally {
      setBusyPlan(null)
    }
  }

  const cancel = async () => {
    setError(null)
    try {
      await apiPost('/me/subscription/cancel', undefined, true)
      await refreshBusiness()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.somethingWentWrong'))
    }
  }

  const isPromo = business?.subscription_provider === 'promo'
  const isTrial = business?.subscription_provider === 'trial'

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-stone-900 dark:text-stone-50">
        {t('dashboard.billing.title')}
      </h1>
      <p className="mt-1 text-stone-500 dark:text-stone-400">{t('dashboard.billing.subtitle')}</p>

      {business && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-stone-200 p-3 dark:border-stone-700">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              isPromo
                ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400'
                : isTrial
                  ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400'
                  : STATUS_BADGE[business.subscription_status]
            }`}
          >
            {isPromo
              ? t('dashboard.billing.status.promo')
              : isTrial
                ? t('dashboard.billing.status.trial')
                : t(`dashboard.billing.status.${business.subscription_status}`)}
          </span>
          {business.subscription_status === 'active' && !isPromo && !isTrial && (
            <span className="text-xs text-stone-400 dark:text-stone-500">
              {t(`dashboard.billing.interval.${business.billing_interval}`)}
            </span>
          )}
          {business.current_period_end && (
            <span className="text-sm text-stone-500 dark:text-stone-400">
              {t(
                isPromo
                  ? 'dashboard.billing.promoEndsOn'
                  : isTrial
                    ? 'dashboard.billing.trialEndsOn'
                    : 'dashboard.billing.renewsOn',
                { date: business.current_period_end.slice(0, 10) },
              )}
            </span>
          )}
          {business.subscription_status === 'active' && !isPromo && !isTrial && (
            <button
              type="button"
              onClick={cancel}
              className="ml-auto text-sm font-medium text-stone-500 hover:text-red-600 dark:text-stone-400 dark:hover:text-red-400"
            >
              {t('dashboard.billing.cancel')}
            </button>
          )}
        </div>
      )}

      {/* interval toggle */}
      <div className="mt-6 inline-flex items-center gap-1 rounded-xl bg-stone-200 p-1 dark:bg-stone-800">
        <button
          type="button"
          onClick={() => setInterval('monthly')}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            !isYearly
              ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-900 dark:text-stone-50'
              : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200'
          }`}
        >
          {t('onboarding.billing.monthly')}
        </button>
        <button
          type="button"
          onClick={() => setInterval('yearly')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            isYearly
              ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-900 dark:text-stone-50'
              : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200'
          }`}
        >
          {t('onboarding.billing.yearly')}
          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            {t('onboarding.billing.yearlyBadge')}
          </span>
        </button>
      </div>

      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        {plans?.map((plan) => (
          <div key={plan.id} className="flex flex-col rounded-2xl border border-stone-200 p-4 dark:border-stone-700">
            <h3 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-50">{plan.name}</h3>
            {isYearly ? (
              <div className="mt-1">
                <p className="text-2xl font-semibold text-stone-900 dark:text-stone-50">
                  €{plan.price_eur_yearly}
                  <span className="text-sm font-normal text-stone-500 dark:text-stone-400">/yr</span>
                </p>
                <p className="text-xs text-stone-400 dark:text-stone-500">
                  €{Math.round(plan.price_eur_yearly / 12)}/mo · saves €{plan.price_eur_monthly * 2}
                </p>
              </div>
            ) : (
              <p className="mt-1 text-2xl font-semibold text-stone-900 dark:text-stone-50">
                €{plan.price_eur_monthly}
                <span className="text-sm font-normal text-stone-500 dark:text-stone-400">
                  {t('onboarding.billing.perMonth')}
                </span>
              </p>
            )}
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              {plan.max_staff === null
                ? t('onboarding.billing.unlimitedStaff')
                : t('onboarding.billing.maxStaff', { count: plan.max_staff })}
            </p>
            <ul className="mt-3 flex flex-col gap-1.5 text-sm text-stone-600 dark:text-stone-300">
              {FEATURE_KEYS.map(({ key, labelKey }) =>
                plan[key] ? (
                  <li key={key} className="flex items-center gap-1.5">
                    <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
                    {t(labelKey)}
                  </li>
                ) : null,
              )}
            </ul>
            <button
              type="button"
              onClick={() => subscribe(plan.id)}
              disabled={
                busyPlan !== null ||
                (business?.plan_id === plan.id &&
                  business.subscription_status === 'active' &&
                  business.billing_interval === interval)
              }
              className="mt-4 rounded-xl bg-stone-800 px-4 py-2.5 font-medium text-white disabled:opacity-50 dark:bg-stone-700 dark:hover:bg-stone-600"
            >
              {business?.plan_id === plan.id &&
              business.subscription_status === 'active' &&
              business.billing_interval === interval
                ? t('onboarding.billing.current')
                : t('onboarding.billing.subscribe')}
            </button>
          </div>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <PromoCodeForm onRedeemed={refreshBusiness} />
    </div>
  )
}
