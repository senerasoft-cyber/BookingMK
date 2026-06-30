import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '../../components/Button'
import { TextInput } from '../../components/TextInput'
import { TurnstileWidget } from '../../components/TurnstileWidget'
import { useAuth } from '../../context/AuthContext'
import { ApiError, apiPost } from '../../lib/api'
import { setTokens } from '../../lib/tokens'
import { pathForStep } from '../../onboardingSteps'
import { AuthCard } from './AuthCard'

type FormValues = {
  email: string
  password: string
  confirm_password: string
  business_name: string
}

function VerifyEmailStep({
  email,
  onSuccess,
}: {
  email: string
  onSuccess: (data: { access_token: string; refresh_token: string; business: { onboarding_step: number } }) => Promise<void>
}) {
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [resent, setResent] = useState(false)

  const submit = async () => {
    setError(null)
    setBusy(true)
    try {
      const result = await apiPost<{
        access_token: string
        refresh_token: string
        business: { onboarding_step: number }
      }>('/auth/register/verify', { email, code })
      onSuccess(result)
    } catch (err) {
      if (err instanceof ApiError) {
        const key = `auth.verify.errors.${err.message}`
        const translated = t(key)
        setError(translated === key ? t('common.somethingWentWrong') : translated)
      } else {
        setError(t('common.somethingWentWrong'))
      }
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    await apiPost('/auth/register/resend', { email })
    setResent(true)
    setTimeout(() => setResent(false), 5000)
  }

  return (
    <AuthCard title={t('auth.verify.title')} subtitle={t('auth.verify.subtitle', { email })}>
      <div className="flex flex-col gap-4">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-center text-2xl font-mono tracking-[0.4em] text-stone-900 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-stone-500 dark:focus:ring-stone-700"
          autoFocus
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Button type="button" onClick={submit} disabled={busy || code.length < 6}>
          {t('auth.verify.submit')}
        </Button>
        <button
          type="button"
          onClick={resend}
          className="text-sm text-stone-500 underline dark:text-stone-400"
        >
          {resent ? t('auth.verify.resent') : t('auth.verify.resend')}
        </button>
      </div>
    </AuthCard>
  )
}

export default function RegisterPage() {
  const { t } = useTranslation()
  const { refreshBusiness } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>()

  const onSubmit = async (values: FormValues) => {
    setServerError(null)
    try {
      const result = await apiPost<{ status: string; email: string }>('/auth/register', {
        email: values.email,
        password: values.password,
        business_name: values.business_name,
        turnstile_token: turnstileToken,
      })
      if (result.status === 'verification_required') {
        setPendingEmail(result.email)
      }
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : t('common.somethingWentWrong'))
    }
  }

  if (pendingEmail) {
    return (
      <VerifyEmailStep
        email={pendingEmail}
        onSuccess={async (data) => {
          setTokens(data.access_token, data.refresh_token)
          await refreshBusiness()
          navigate(`/onboarding/${pathForStep(data.business.onboarding_step)}`)
        }}
      />
    )
  }

  return (
    <AuthCard title={t('auth.register.title')} subtitle={t('auth.register.subtitle')}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <TextInput
          label={t('auth.register.businessName')}
          {...register('business_name', { required: true })}
          error={errors.business_name && t('common.required')}
        />
        <TextInput
          label={t('auth.register.email')}
          type="email"
          {...register('email', { required: true })}
          error={errors.email && t('common.required')}
        />
        <TextInput
          label={t('auth.register.password')}
          type="password"
          {...register('password', { required: true, minLength: 10, maxLength: 128 })}
          error={errors.password && t('auth.register.passwordMinLength')}
        />
        <TextInput
          label={t('auth.register.confirmPassword')}
          type="password"
          {...register('confirm_password', {
            required: true,
            validate: (v) => v === watch('password') || t('auth.register.passwordMismatch'),
          })}
          error={errors.confirm_password?.message}
        />
        <TurnstileWidget onVerify={setTurnstileToken} />
        {serverError && <p className="text-sm text-red-600 dark:text-red-400">{serverError}</p>}
        <p className="text-xs text-stone-400 dark:text-stone-500">
          {t('auth.register.agreeToTermsPrefix')}{' '}
          <Link to="/terms" className="underline">
            {t('auth.register.termsLink')}
          </Link>{' '}
          {t('common.and')}{' '}
          <Link to="/privacy" className="underline">
            {t('auth.register.privacyLink')}
          </Link>
          .
        </p>
        <Button type="submit" disabled={isSubmitting || turnstileToken === null} className="mt-2">
          {t('auth.register.submit')}
        </Button>
      </form>
      <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">
        {t('auth.register.haveAccount')}{' '}
        <Link to="/login" className="font-medium text-stone-900 underline dark:text-stone-100">
          {t('auth.register.loginLink')}
        </Link>
      </p>
    </AuthCard>
  )
}
