import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { apiGet } from '../lib/api'

type HealthResponse = { status: string }

export default function HomePage() {
  const { t } = useTranslation()

  const { data, isPending, isError } = useQuery({
    queryKey: ['health'],
    queryFn: () => apiGet<HealthResponse>('/health'),
  })

  return (
    <main className="flex min-h-screen items-center justify-center bg-orange-50 px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg shadow-orange-100">
        <h1 className="font-display text-3xl font-semibold text-stone-900">{t('home.title')}</h1>
        <p className="mt-2 text-stone-600">{t('home.subtitle')}</p>

        <div className="mt-6 flex items-center justify-between rounded-xl bg-stone-50 px-4 py-3">
          <span className="text-sm text-stone-500">{t('home.backendStatus')}</span>
          <span
            className={
              isError
                ? 'text-sm font-medium text-red-600'
                : isPending
                  ? 'text-sm font-medium text-stone-400'
                  : 'text-sm font-medium text-emerald-600'
            }
          >
            {isError ? t('status.error') : isPending ? t('status.checking') : t('status.ok')}
          </span>
        </div>
        {data && <p className="mt-2 text-xs text-stone-400">{JSON.stringify(data)}</p>}

        <div className="mt-6 flex gap-3">
          <Link
            to="/register"
            className="flex-1 rounded-xl bg-stone-900 px-4 py-2.5 text-center font-medium text-white"
          >
            {t('home.register')}
          </Link>
          <Link
            to="/login"
            className="flex-1 rounded-xl border border-stone-200 px-4 py-2.5 text-center font-medium text-stone-700"
          >
            {t('home.login')}
          </Link>
        </div>

        <div className="mt-6 flex justify-center gap-4 border-t border-stone-100 pt-4 text-xs text-stone-400">
          <Link to="/pricing" className="hover:text-stone-600">
            Pricing
          </Link>
          <Link to="/terms" className="hover:text-stone-600">
            Terms
          </Link>
          <Link to="/privacy" className="hover:text-stone-600">
            Privacy
          </Link>
          <Link to="/refunds" className="hover:text-stone-600">
            Refunds
          </Link>
        </div>
      </div>
    </main>
  )
}
