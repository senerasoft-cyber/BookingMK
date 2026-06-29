import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { Button } from '../../components/Button'
import { TextInput } from '../../components/TextInput'
import { TurnstileWidget } from '../../components/TurnstileWidget'
import { ApiError, apiPost } from '../../lib/api'
import type { BookingResult, PublicService, VerifyStartResult } from '../../types'

type FormValues = { name: string; email: string; phone: string; website: string }

export default function DetailsStep({
  slug,
  service,
  startsAt,
  accentKey,
  requireVerification,
  collectPhone,
  onBack,
  onBooked,
  onVerificationStarted,
}: {
  slug: string
  service: PublicService
  startsAt: string
  accentKey: string
  requireVerification: boolean
  collectPhone: boolean
  onBack: () => void
  onBooked: (result: BookingResult) => void
  onVerificationStarted: (info: { name: string; email: string; devCode?: string }) => void
}) {
  const { t } = useTranslation()
  const [serverError, setServerError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: { website: '' } })

  const onSubmit = async (values: FormValues) => {
    setServerError(null)
    try {
      if (requireVerification) {
        const result = await apiPost<VerifyStartResult>(`/b/${slug}/verify/start`, {
          service_id: service.id,
          starts_at: startsAt,
          email: values.email,
          website: values.website,
          turnstile_token: turnstileToken,
        })
        onVerificationStarted({
          name: values.name,
          email: values.email,
          devCode: result.dev_code,
        })
      } else {
        const result = await apiPost<BookingResult>(`/b/${slug}/book`, {
          service_id: service.id,
          starts_at: startsAt,
          name: values.name,
          email: values.email,
          phone: collectPhone ? values.phone : undefined,
          website: values.website,
          turnstile_token: turnstileToken,
        })
        onBooked(result)
      }
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : t('common.somethingWentWrong'))
    }
  }

  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-stone-900">
        {t('public.details.title')}
      </h2>
      <form className="mt-4 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <input
          type="text"
          {...register('website')}
          autoComplete="off"
          tabIndex={-1}
          aria-hidden="true"
          style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
        />
        <TextInput
          label={t('public.details.name')}
          {...register('name', { required: true })}
          error={errors.name && t('common.required')}
        />
        <TextInput
          label={t('public.details.email')}
          placeholder={t('public.details.emailPlaceholder')}
          type="email"
          {...register('email', { required: true })}
          error={errors.email && t('common.required')}
        />
        {collectPhone && (
          <TextInput
            label={t('public.details.phone')}
            placeholder={t('public.details.phonePlaceholder')}
            {...register('phone', { required: true })}
            error={errors.phone && t('common.required')}
          />
        )}
        <TurnstileWidget onVerify={setTurnstileToken} />
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        <div className="mt-2 flex gap-3">
          <Button type="button" variant="secondary" onClick={onBack}>
            {t('public.details.back')}
          </Button>
          <Button type="submit" disabled={isSubmitting} accentKey={accentKey}>
            {t('public.details.submit')}
          </Button>
        </div>
      </form>
    </div>
  )
}
