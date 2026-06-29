import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { Button } from '../../components/Button'
import { TextInput } from '../../components/TextInput'
import { ApiError, apiPost } from '../../lib/api'
import { AuthCard } from './AuthCard'

type FormValues = { new_password: string }

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>()

  const onSubmit = async (values: FormValues) => {
    setServerError(null)
    try {
      await apiPost('/auth/password-reset/confirm', { token, ...values })
      navigate('/login')
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : t('common.somethingWentWrong'))
    }
  }

  if (!token) {
    return (
      <AuthCard title={t('auth.resetPassword.title')} subtitle={t('auth.resetPassword.subtitle')}>
        <p className="text-sm text-red-600">{t('auth.resetPassword.missingToken')}</p>
        <p className="mt-4 text-sm text-stone-500">
          <Link to="/forgot-password" className="font-medium text-stone-900 underline">
            {t('auth.forgotPassword.title')}
          </Link>
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={t('auth.resetPassword.title')} subtitle={t('auth.resetPassword.subtitle')}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <TextInput
          label={t('auth.resetPassword.newPassword')}
          type="password"
          {...register('new_password', { required: true, minLength: 8 })}
          error={errors.new_password && t('auth.register.passwordMinLength')}
        />
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {t('auth.resetPassword.submit')}
        </Button>
      </form>
    </AuthCard>
  )
}
