import { Check } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Button } from '../../components/Button'
import { useAuth } from '../../context/AuthContext'
import { apiPatch } from '../../lib/api'
import { advanceOnboarding } from '../../lib/onboarding'
import { ACCENT_KEYS, ACCENTS } from '../../theme/accents'

export default function BrandingStep() {
  const { t } = useTranslation()
  const { business, refreshBusiness } = useAuth()
  const navigate = useNavigate()
  const [accentKey, setAccentKey] = useState(business?.accent_key ?? 'slate')
  const [tagline, setTagline] = useState(business?.tagline ?? '')
  const [saving, setSaving] = useState(false)

  const next = async () => {
    setSaving(true)
    try {
      await apiPatch('/me/business', { accent_key: accentKey, tagline }, true)
      await advanceOnboarding(refreshBusiness, navigate, 4)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-stone-900">
        {t('onboarding.branding.title')}
      </h2>
      <p className="mt-1 text-stone-500">{t('onboarding.branding.subtitle')}</p>

      <p className="mt-6 text-sm font-medium text-stone-700">{t('onboarding.branding.accent')}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {ACCENT_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setAccentKey(key)}
            className={`flex h-9 w-9 items-center justify-center rounded-full ${ACCENTS[key].main}`}
            aria-label={key}
          >
            {accentKey === key && <Check size={16} className="text-white" />}
          </button>
        ))}
      </div>

      <label className="mt-6 flex flex-col gap-1.5">
        <span className="text-sm font-medium text-stone-700">
          {t('onboarding.branding.tagline')}
        </span>
        <input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder={t('onboarding.branding.taglinePlaceholder')}
          className="rounded-xl border border-stone-200 px-4 py-2.5 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200"
        />
      </label>

      <p className="mt-4 text-xs text-stone-400">{t('onboarding.branding.uploadsNote')}</p>

      <div className="mt-8 flex justify-end">
        <Button onClick={next} disabled={saving} accentKey={accentKey}>
          {t('common.next')}
        </Button>
      </div>
    </div>
  )
}
