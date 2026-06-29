import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../components/Button'
import { useAuth } from '../../context/AuthContext'
import { ApiError, apiDelete, apiGet, apiPost } from '../../lib/api'
import type { Client, Voucher, VoucherKind } from '../../types'

const VOUCHERS_KEY = ['vouchers']

export default function MarketingPage() {
  const { t } = useTranslation()
  const { business } = useAuth()
  const queryClient = useQueryClient()
  const [clientId, setClientId] = useState<number | ''>('')
  const [kind, setKind] = useState<VoucherKind>('free')
  const [percentOff, setPercentOff] = useState(10)
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    data: vouchers,
    isError,
    error,
  } = useQuery({
    queryKey: VOUCHERS_KEY,
    queryFn: () => apiGet<Voucher[]>('/me/vouchers', true),
    retry: false,
  })

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => apiGet<Client[]>('/clients', true),
    enabled: !isError,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: VOUCHERS_KEY })

  const remove = async (id: number) => {
    await apiDelete(`/me/vouchers/${id}`, true)
    invalidate()
  }

  const onSubmit = async () => {
    if (!clientId) return
    setServerError(null)
    setSubmitting(true)
    try {
      await apiPost(
        '/me/vouchers',
        { client_id: clientId, kind, percent_off: kind === 'percent_off' ? percentOff : undefined },
        true,
      )
      setClientId('')
      invalidate()
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : t('common.somethingWentWrong'))
    } finally {
      setSubmitting(false)
    }
  }

  if (isError) {
    const message =
      error instanceof ApiError && error.message === 'marketing_not_enabled'
        ? t('dashboard.marketing.notEnabled')
        : error instanceof ApiError && error.message === 'plan_marketing_tools_not_allowed'
          ? t('dashboard.planErrors.plan_marketing_tools_not_allowed')
          : t('common.somethingWentWrong')
    const linkHref =
      error instanceof ApiError && error.message === 'marketing_not_enabled'
        ? '/dashboard/settings'
        : '/dashboard/billing'
    const linkLabel =
      error instanceof ApiError && error.message === 'marketing_not_enabled'
        ? t('dashboard.marketing.goToSettings')
        : t('dashboard.planErrors.upgradeLink')
    return (
      <div>
        <h1 className="font-display text-xl font-semibold text-stone-900">
          {t('dashboard.marketing.title')}
        </h1>
        <p className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
          {message}{' '}
          <a href={linkHref} className="font-medium underline">
            {linkLabel}
          </a>
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-stone-900">
        {t('dashboard.marketing.title')}
      </h1>
      <p className="mt-1 text-stone-500">{t('dashboard.marketing.subtitle')}</p>
      {business?.loyalty_enabled && (
        <p className="mt-2 text-xs text-stone-400">
          {t('dashboard.marketing.loyaltyActive', { n: business.loyalty_every_n })}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {vouchers?.map((voucher) => (
          <div
            key={voucher.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-stone-200 p-3"
          >
            <div>
              <p className="font-medium text-stone-900">
                {voucher.client_name ?? t('dashboard.marketing.unknownClient')}
              </p>
              <p className="text-sm text-stone-500">
                {voucher.kind === 'free'
                  ? t('dashboard.marketing.freeBooking')
                  : t('dashboard.marketing.percentOff', { percent: voucher.percent_off })}
                {voucher.source === 'loyalty' && ` · ${t('dashboard.marketing.loyaltySource')}`}
              </p>
              <p className="font-mono text-xs text-stone-400">{voucher.code}</p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  voucher.consumed_at
                    ? 'bg-stone-100 text-stone-500'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {voucher.consumed_at
                  ? t('dashboard.marketing.used')
                  : t('dashboard.marketing.pending')}
              </span>
              {!voucher.consumed_at && (
                <button
                  type="button"
                  onClick={() => remove(voucher.id)}
                  className="text-xs font-medium text-stone-400 underline hover:text-red-600"
                >
                  {t('dashboard.marketing.revoke')}
                </button>
              )}
            </div>
          </div>
        ))}
        {vouchers && vouchers.length === 0 && (
          <p className="text-stone-400">{t('dashboard.marketing.empty')}</p>
        )}
      </div>

      <h2 className="mt-8 font-medium text-stone-700">{t('dashboard.marketing.grantVoucher')}</h2>
      <p className="text-xs text-stone-400">{t('dashboard.marketing.grantHint')}</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-stone-700">{t('dashboard.marketing.client')}</span>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : '')}
            className="rounded-xl border border-stone-200 px-3 py-2.5 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200"
          >
            <option value="">{t('dashboard.marketing.selectClient')}</option>
            {clients?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-stone-700">{t('dashboard.marketing.voucherKind')}</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as VoucherKind)}
            className="rounded-xl border border-stone-200 px-3 py-2.5 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200"
          >
            <option value="free">{t('dashboard.marketing.freeBooking')}</option>
            <option value="percent_off">{t('dashboard.marketing.percentOffOption')}</option>
          </select>
        </label>
        {kind === 'percent_off' && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-stone-700">
              {t('dashboard.marketing.percentOffLabel')}
            </span>
            <input
              type="number"
              min={1}
              max={100}
              value={percentOff}
              onChange={(e) => setPercentOff(Number(e.target.value))}
              className="w-24 rounded-xl border border-stone-200 px-3 py-2.5 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200"
            />
          </label>
        )}
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!clientId || submitting}
          accentKey={business?.accent_key}
        >
          {t('dashboard.marketing.grantAction')}
        </Button>
      </div>
      {serverError && <p className="mt-2 text-sm text-red-600">{serverError}</p>}
    </div>
  )
}
