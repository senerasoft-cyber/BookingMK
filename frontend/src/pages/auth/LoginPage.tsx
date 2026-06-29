import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '../../components/Button'
import { TextInput } from '../../components/TextInput'
import { useAuth } from '../../context/AuthContext'
import { ApiError } from '../../lib/api'
import { pathForStep } from '../../onboardingSteps'
import { AuthCard } from './AuthCard'

type FormValues = { email: string; password: string }

export default function LoginPage() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>()

  const onSubmit = async (values: FormValues) => {
    setServerError(null)
    try {
      const business = await login(values)
      if (business.onboarding_completed_at) {
        navigate('/dashboard')
      } else {
        navigate(`/onboarding/${pathForStep(business.onboarding_step)}`)
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setServerError(t('auth.errors.invalidCredentials'))
      } else if (err instanceof ApiError && err.status === 429) {
        setServerError(t('auth.errors.locked'))
      } else {
        setServerError(err instanceof ApiError ? err.message : t('common.somethingWentWrong'))
      }
    }
  }

  return (
    <AuthCard title={t('auth.login.title')} subtitle={t('auth.login.subtitle')}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <TextInput
          label={t('auth.login.email')}
          type="email"
          {...register('email', { required: true })}
          error={errors.email && t('common.required')}
        />
        <TextInput
          label={t('auth.login.password')}
          type="password"
          {...register('password', { required: true })}
          error={errors.password && t('common.required')}
        />
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {t('auth.login.submit')}
        </Button>
      </form>
      <p className="mt-3 text-sm text-stone-500">
        <Link to="/forgot-password" className="font-medium text-stone-900 underline">
          {t('auth.login.forgotPassword')}
        </Link>
      </p>
      <p className="mt-4 text-sm text-stone-500">
        {t('auth.login.noAccount')}{' '}
        <Link to="/register" className="font-medium text-stone-900 underline">
          {t('auth.login.registerLink')}
        </Link>
      </p>
    </AuthCard>
  )
}
