import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Button } from '../../components/Button'
import { TextInput } from '../../components/TextInput'
import { ApiError, apiPost } from '../../lib/api'
import { AuthCard } from './AuthCard'

type FormValues = { email: string }

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [serverError, setServerError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>()

  const onSubmit = async (values: FormValues) => {
    setServerError(null)
    try {
      await apiPost('/auth/password-reset/request', values)
      setSent(true)
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : t('common.somethingWentWrong'))
    }
  }

  return (
    <AuthCard title={t('auth.forgotPassword.title')} subtitle={t('auth.forgotPassword.subtitle')}>
      {sent ? (
        <p className="text-sm text-stone-600 dark:text-stone-300">{t('auth.forgotPassword.sent')}</p>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <TextInput
            label={t('auth.login.email')}
            type="email"
            {...register('email', { required: true })}
            error={errors.email && t('common.required')}
          />
          {serverError && <p className="text-sm text-red-600 dark:text-red-400">{serverError}</p>}
          <Button type="submit" disabled={isSubmitting} className="mt-2">
            {t('auth.forgotPassword.submit')}
          </Button>
        </form>
      )}
      <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">
        <Link to="/login" className="font-medium text-stone-900 underline dark:text-stone-100">
          {t('auth.forgotPassword.backToLogin')}
        </Link>
      </p>
    </AuthCard>
  )
}
