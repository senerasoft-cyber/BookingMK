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
      <h2 className="font-display text-xl font-semibold text-stone-900">
        {t('onboarding.billing.title')}
      </h2>
      <p className="mt-1 text-stone-500">{t('onboarding.billing.subtitle')}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {plans?.map((plan) => (
          <div key={plan.id} className="flex flex-col rounded-2xl border border-stone-200 p-4">
            <h3 className="font-display text-lg font-semibold text-stone-900">{plan.name}</h3>
            <p className="mt-1 text-2xl font-semibold text-stone-900">
              €{plan.price_eur_monthly}
              <span className="text-sm font-normal text-stone-500">
                {t('onboarding.billing.perMonth')}
              </span>
            </p>
            <p className="mt-2 text-sm text-stone-500">
              {plan.max_staff === null
                ? t('onboarding.billing.unlimitedStaff')
                : t('onboarding.billing.maxStaff', { count: plan.max_staff })}
            </p>
            <ul className="mt-3 flex flex-col gap-1.5 text-sm text-stone-600">
              {FEATURE_KEYS.map(({ key, labelKey }) =>
                plan[key] ? (
                  <li key={key} className="flex items-center gap-1.5">
                    <Check size={14} className="text-emerald-600" />
                    {t(labelKey)}
                  </li>
                ) : null,
              )}
            </ul>
            <button
              type="button"
              onClick={() => subscribe(plan.id)}
              disabled={busyPlan !== null}
              className="mt-4 rounded-xl bg-stone-800 px-4 py-2.5 font-medium text-white disabled:opacity-50"
            >
              {business?.plan_id === plan.id
                ? t('onboarding.billing.current')
                : t('onboarding.billing.subscribe')}
            </button>
          </div>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-8 border-t border-stone-100 pt-6">
        <p className="text-sm font-medium text-stone-700">{t('onboarding.billing.havePromo')}</p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <input
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            placeholder="ABCD1234"
            className="rounded-xl border border-stone-200 px-4 py-2.5 font-mono uppercase tracking-widest outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200"
          />
          <button
            type="button"
            onClick={redeemPromo}
            disabled={promoBusy || !promoCode.trim()}
            className="rounded-xl bg-stone-800 px-5 py-2.5 font-medium text-white disabled:opacity-50"
          >
            {t('onboarding.billing.promoRedeem')}
          </button>
        </div>
        {promoError && <p className="mt-2 text-sm text-red-600">{promoError}</p>}
      </div>
    </div>
  )
}
