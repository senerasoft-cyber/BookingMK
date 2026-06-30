import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../components/Button'
import { ApiError, apiPost } from '../../lib/api'
import type { BookingResult, PublicService, VerifyCheckResult, VerifyStartResult } from '../../types'

function errorMessage(t: (key: string) => string, err: unknown): string {
  if (err instanceof ApiError) {
    // backend error responses are {"error": "<code>"}, which ApiError surfaces as .message
    const key = `public.verify.errors.${err.message}`
    const translated = t(key)
    return translated === key ? t('public.verify.errors.generic') : translated
  }
  return t('public.verify.errors.generic')
}

export default function VerifyStep({
  slug,
  service,
  startsAt,
  name,
  email,
  devCode,
  accentKey,
  onBack,
  onBooked,
}: {
  slug: string
  service: PublicService
  startsAt: string
  name: string
  email: string
  devCode?: string
  accentKey: string
  onBack: () => void
  onBooked: (result: BookingResult) => void
}) {
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const [currentDevCode, setCurrentDevCode] = useState(devCode)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submitCode = async () => {
    setError(null)
    setBusy(true)
    try {
      const checked = await apiPost<VerifyCheckResult>(`/b/${slug}/verify/check`, { email, code })
      const result = await apiPost<BookingResult>(`/b/${slug}/book`, {
        service_id: service.id,
        starts_at: startsAt,
        name,
        email,
        verification_token: checked.verification_token,
      })
      onBooked(result)
    } catch (err) {
      setError(errorMessage(t, err))
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    setError(null)
    setBusy(true)
    try {
      const result = await apiPost<VerifyStartResult>(`/b/${slug}/verify/start`, {
        service_id: service.id,
        starts_at: startsAt,
        email,
      })
      setCurrentDevCode(result.dev_code)
    } catch (err) {
      setError(errorMessage(t, err))
    } finally {
      setBusy(false)
    }
  }

  const skipVerification = async () => {
    setError(null)
    setBusy(true)
    try {
      const result = await apiPost<BookingResult>(`/b/${slug}/book`, {
        service_id: service.id,
        starts_at: startsAt,
        name,
        email,
        skip_verification: true,
      })
      onBooked(result)
    } catch (err) {
      setError(errorMessage(t, err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-stone-900 dark:text-stone-50">
        {t('public.verify.title')}
      </h2>
      <p className="mt-1 text-stone-500 dark:text-stone-400">{t('public.verify.subtitle', { email })}</p>
      {currentDevCode && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
          {t('public.verify.devCodeHint', { code: currentDevCode })}
        </p>
      )}

      <label className="mt-4 flex flex-col gap-1.5">
        <span className="text-sm font-medium text-stone-700 dark:text-stone-200">{t('public.verify.code')}</span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          maxLength={6}
          className="rounded-xl border border-stone-200 px-4 py-2.5 text-lg tracking-widest outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-stone-500 dark:focus:ring-stone-700"
        />
      </label>

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-4 flex gap-3">
        <Button type="button" variant="secondary" onClick={onBack} disabled={busy}>
          {t('public.datetime.back')}
        </Button>
        <Button
          type="button"
          onClick={submitCode}
          disabled={busy || code.length < 4}
          accentKey={accentKey}
        >
          {t('public.verify.submit')}
        </Button>
      </div>

      <div className="mt-4 text-sm">
        <button
          type="button"
          disabled={busy}
          onClick={resend}
          className="font-medium text-stone-600 underline dark:text-stone-300"
        >
          {t('public.verify.resendCode')}
        </button>
      </div>

      <div className="mt-4 text-sm">
        <span className="text-stone-400 dark:text-stone-500">{t('public.verify.cantGetCode')} </span>
        <button
          type="button"
          disabled={busy}
          onClick={skipVerification}
          className="font-medium text-stone-600 underline dark:text-stone-300"
        >
          {t('public.verify.cantGetCodeAction')}
        </button>
      </div>
    </div>
  )
}
