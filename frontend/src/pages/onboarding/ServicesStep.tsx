import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Button } from '../../components/Button'
import { ServicesEditor } from '../../components/ServicesEditor'
import { useAuth } from '../../context/AuthContext'
import { advanceOnboarding } from '../../lib/onboarding'

export default function ServicesStep() {
  const { t } = useTranslation()
  const { business, refreshBusiness } = useAuth()
  const navigate = useNavigate()

  const next = async () => {
    await advanceOnboarding(refreshBusiness, navigate, 2)
  }

  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-stone-900">
        {t('onboarding.services.title')}
      </h2>
      <p className="mt-1 text-stone-500">{t('onboarding.services.subtitle')}</p>

      <div className="mt-6">
        <ServicesEditor />
      </div>

      <div className="mt-8 flex justify-end">
        <Button onClick={next} accentKey={business?.accent_key}>
          {t('common.next')}
        </Button>
      </div>
    </div>
  )
}
