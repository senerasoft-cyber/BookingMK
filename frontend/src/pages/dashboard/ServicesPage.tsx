import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'

import { ServicesEditor } from '../../components/ServicesEditor'
import type { DashboardContext } from './DashboardLayout'

export default function ServicesPage() {
  const { t } = useTranslation()
  const { activeStaffId } = useOutletContext<DashboardContext>()

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-stone-900 dark:text-stone-50">
        {t('onboarding.services.title')}
      </h1>
      <p className="mt-1 text-stone-500 dark:text-stone-400">{t('onboarding.services.subtitle')}</p>

      <div className="mt-4">
        <ServicesEditor staffId={activeStaffId ?? undefined} />
      </div>
    </div>
  )
}
