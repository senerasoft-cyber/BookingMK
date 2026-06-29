import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import { apiGet, apiPatch } from '../../lib/api'
import { advanceOnboarding } from '../../lib/onboarding'
import { getAccent } from '../../theme/accents'
import { getIcon } from '../../theme/icons'
import type { Business, BusinessType } from '../../types'

export default function TypeStep() {
  const { t, i18n } = useTranslation()
  const { business, refreshBusiness } = useAuth()
  const navigate = useNavigate()
  const [pending, setPending] = useState<string | null>(null)

  const { data: types, isPending } = useQuery({
    queryKey: ['business-types'],
    queryFn: () => apiGet<BusinessType[]>('/business-types'),
  })

  const isEnglish = i18n.language.startsWith('en')

  const choose = async (typeId: string) => {
    setPending(typeId)
    try {
      await apiPatch<Business>('/me/business', { type_id: typeId }, true)
      await advanceOnboarding(refreshBusiness, navigate, 1)
    } finally {
      setPending(null)
    }
  }

  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-stone-900">
        {t('onboarding.type.title')}
      </h2>
      <p className="mt-1 text-stone-500">{t('onboarding.type.subtitle')}</p>

      {isPending ? (
        <p className="mt-6 text-stone-400">{t('common.loading')}</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {types?.map((type) => {
            const Icon = getIcon(type.icon_key)
            const accent = getAccent(type.accent_key)
            const selected = business?.type_id === type.id
            return (
              <button
                key={type.id}
                type="button"
                disabled={pending !== null}
                onClick={() => choose(type.id)}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition disabled:opacity-50 ${
                  selected
                    ? `border-transparent ${accent.soft}`
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <span className={`rounded-full p-2 ${accent.soft} ${accent.softText}`}>
                  <Icon size={20} />
                </span>
                <span className="text-sm font-medium text-stone-700">
                  {isEnglish ? type.label_en : type.label_mk}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
