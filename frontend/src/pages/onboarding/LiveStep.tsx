import { PartyPopper } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Button } from '../../components/Button'
import { useAuth } from '../../context/AuthContext'

export default function LiveStep() {
  const { t } = useTranslation()
  const { business } = useAuth()
  const navigate = useNavigate()

  const publicUrl = business ? `${window.location.origin}/b/${business.slug}` : ''

  return (
    <div className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stone-100">
        <PartyPopper className="text-stone-700" />
      </div>
      <h2 className="mt-4 font-display text-2xl font-semibold text-stone-900">
        {t('onboarding.live.title')}
      </h2>
      <p className="mt-1 text-stone-500">{t('onboarding.live.subtitle')}</p>

      <a
        href={publicUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block rounded-xl bg-stone-50 px-4 py-2 font-mono text-sm text-stone-700"
      >
        {publicUrl}
      </a>

      <div className="mt-8 flex justify-center gap-3">
        <Button variant="secondary" onClick={() => window.open(publicUrl, '_blank')}>
          {t('onboarding.live.previewButton')}
        </Button>
        <Button accentKey={business?.accent_key} onClick={() => navigate('/dashboard')}>
          {t('onboarding.live.doneButton')}
        </Button>
      </div>
    </div>
  )
}
