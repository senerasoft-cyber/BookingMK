import { useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { ApiError, apiGet, apiPost } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { advanceOnboarding } from '../../lib/onboarding'
import type { Plan } from '../../types'

function promoErrorMessage(t: (key: string) => string, err: unknown): string {
  if (err instanceof ApiError) {
    const key = `dashboard.billing.promoErrors.${err.message}`
    const translated = t(key)
    return translated === key ? t('common.somethingWentWrong') : translated
  }
  return t('common.somethingWentWrong')
}

function trialErrorMessage(t: (key: string) => string, err: unknown): string {
  if (err instanceof ApiError) {
    const key = `onboarding.billing.trialErrors.${err.message}`
    const translated = t(key)
    return translated === key ? t('common.somethingWentWrong') : translated
  }
  return t('common.somethingWentWrong')
}

const FEATURE_KEYS: { key: keyof Plan; labelKey: string }[] = [
  { key: 'stats', labelKey: 'onboarding.billing.featureStats' },
  { key: 'marketing_tools', labelKey: 'onboarding.billing.featureMarketingTools' },
  { key: 'white_label', labelKey: 'onboarding.billing.featureWhiteLabel' },
]

export default function BillingStep() {
  const { t } = useTranslation()
  const { business, refreshBusiness } = useAuth()
  const navigate = useNavigate()
  const [busyPlan, setBusyPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [promoCode, setPromoCode] = useState('')
  const [promoBusy, setPromoBusy] = useState(false)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [trialBusy, setTrialBusy] = useState(false)
  const [trialError, setTrialError] = useState<string | null>(null)

  const startTrial = async () => {
    setTrialError(null)
    setTrialBusy(true)
    try {
      await apiPost('/me/subscription/start-trial', undefined, true)
      await advanceOnboarding(refreshBusiness, navigate, 6)
    } catch (err) {
      setTrialError(trialErrorMessage(t, err))
    } finally {
      setTrialBusy(false)
    }
  }

  const redeemPromo = async () => {
    if (!promoCode.trim()) return
    setPromoError(null)
    setPromoBusy(true)
    try {
      await apiPost('/me/subscription/redeem-promo', { code: promoCode.trim().toUpperCase() }, true)
      await advanceOnboarding(refreshBusiness, navigate, 6)
    } catch (err) {
      setPromoError(promoErrorMessage(t, err))
    } finally {
      setPromoBusy(false)
    }
  }

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: () => apiGet<Plan[]>('/plans', true),
  })

  const subscribe = async (planId: string) => {
    setError(null)
    setBusyPlan(planId)
    try {
      const result = await apiPost<{ business: unknown; checkout_url?: string | null }>(
        '/me/subscription/checkout',
        { plan_id: planId },
        true,
      )
      if (result.checkout_url) {
        window.location.assign(result.checkout_url)
        return
      }
      await advanceOnboarding(refreshBusiness, navigate, 6)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.somethingWentWrong'))
    } finally {
      setBusyPlan(null)
    }
  }

  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-stone-900 dark:text-stone-50">
        {t('onboarding.billing.title')}
      </h2>
      <p className="mt-1 text-stone-500 dark:text-stone-400">{t('onboarding.billing.subtitle')}</p>

      {!business?.trial_started_at && (
        <div className="mt-6 flex flex-col items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display font-semibold text-amber-900 dark:text-amber-200">
              {t('onboarding.billing.startTrial')}
            </p>
            <p className="mt-0.5 text-sm text-amber-800/80 dark:text-amber-300/80">
              {t('onboarding.billing.startTrialHint')}
            </p>
          </div>
          <button
            type="button"
            onClick={startTrial}
            disabled={trialBusy}
            className="shrink-0 rounded-xl bg-amber-500 px-5 py-2.5 font-medium text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {t('onboarding.billing.startTrial')}
          </button>
        </div>
      )}
      {trialError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{trialError}</p>}

      {!business?.trial_started_at && (
        <p className="mt-6 text-sm font-medium text-stone-500 dark:text-stone-400">
          {t('onboarding.billing.orChoosePlan')}
        </p>
      )}

      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        {plans?.map((plan) => (
          <div key={plan.id} className="flex flex-col rounded-2xl border border-stone-200 p-4 dark:border-stone-700">
            <h3 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-50">{plan.name}</h3>
            <p className="mt-1 text-2xl font-semibold text-stone-900 dark:text-stone-50">
              €{plan.price_eur_monthly}
              <span className="text-sm font-normal text-stone-500 dark:text-stone-400">
                {t('onboarding.billing.perMonth')}
              </span>
            </p>
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
              disabled={busyPlan !== null}
              className="mt-4 rounded-xl bg-stone-800 px-4 py-2.5 font-medium text-white disabled:opacity-50 dark:bg-stone-600"
            >
              {business?.plan_id === plan.id
                ? t('onboarding.billing.current')
                : t('onboarding.billing.subscribe')}
            </button>
          </div>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-8 border-t border-stone-100 pt-6 dark:border-stone-800">
        <p className="text-sm font-medium text-stone-700 dark:text-stone-300">{t('onboarding.billing.havePromo')}</p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <input
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            placeholder="ABCD1234"
            className="rounded-xl border border-stone-200 px-4 py-2.5 font-mono uppercase tracking-widest outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-stone-500 dark:focus:ring-stone-700"
          />
          <button
            type="button"
            onClick={redeemPromo}
            disabled={promoBusy || !promoCode.trim()}
            className="rounded-xl bg-stone-800 px-5 py-2.5 font-medium text-white disabled:opacity-50 dark:bg-stone-600"
          >
            {t('onboarding.billing.promoRedeem')}
          </button>
        </div>
        {promoError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{promoError}</p>}
      </div>
    </div>
  )
}
