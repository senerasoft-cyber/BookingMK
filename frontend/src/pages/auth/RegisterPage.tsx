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

type FormValues = { email: string; password: string; business_name: string }

export default function RegisterPage() {
  const { t } = useTranslation()
  const { register: registerBusiness } = useAuth()
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
      const business = await registerBusiness(values)
      navigate(`/onboarding/${pathForStep(business.onboarding_step)}`)
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : t('common.somethingWentWrong'))
    }
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
          {...register('password', { required: true, minLength: 8 })}
          error={errors.password && t('auth.register.passwordMinLength')}
        />
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        <p className="text-xs text-stone-400">
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
        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {t('auth.register.submit')}
        </Button>
      </form>
      <p className="mt-4 text-sm text-stone-500">
        {t('auth.register.haveAccount')}{' '}
        <Link to="/login" className="font-medium text-stone-900 underline">
          {t('auth.register.loginLink')}
        </Link>
      </p>
    </AuthCard>
  )
}
